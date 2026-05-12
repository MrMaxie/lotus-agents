import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';
import {
  lotusArtifactContentVersion,
  lotusArtifactMetadataSchema,
  lotusManifest,
  lotusManifestSchema,
  type ManagedArtifact,
  managedArtifacts,
} from './manifest.js';
import { buildProgram, runCli } from './program.js';

function createWriters() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    context: {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    },
  };
}

async function createFile(cwd: string, path: string, content = ''): Promise<void> {
  const absolutePath = join(cwd, path);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

async function createDirectory(cwd: string, path: string): Promise<void> {
  await mkdir(join(cwd, path), { recursive: true });
}

async function copyRepositoryFile(cwd: string, sourcePath: string, targetPath: string): Promise<void> {
  const content = await readFile(join(process.cwd(), sourcePath), 'utf8');

  await createFile(cwd, targetPath, content);
}

async function createManagedArtifact(
  cwd: string,
  artifact: ManagedArtifact,
  metadataOverrides: Record<string, unknown> = {},
): Promise<void> {
  const metadata = {
    ...artifact.metadata,
    ...metadataOverrides,
  };

  if (artifact.kind === 'directory') {
    await createDirectory(cwd, artifact.path);
    await writeFile(join(cwd, artifact.path, '.lotus.json'), `${JSON.stringify({ metadata }, null, 2)}\n`);
    return;
  }

  if (artifact.migration.strategy === 'structured-sections') {
    await createFile(cwd, artifact.path, `# Managed ${artifact.path}\n\nUnrelated local content.\n`);
    return;
  }

  await createFile(
    cwd,
    artifact.path,
    `---\n${JSON.stringify(metadata, null, 2)}\n---\n# Managed ${artifact.path}\n\nUnrelated local content.\n`,
  );
}

async function createManagedArtifacts(cwd: string, overridesByPath: Record<string, Record<string, unknown>> = {}): Promise<void> {
  for (const artifact of managedArtifacts) {
    await createManagedArtifact(cwd, artifact, overridesByPath[artifact.path]);
  }
}

async function expectPathExists(cwd: string, path: string): Promise<void> {
  await expect(access(join(cwd, path))).resolves.toBeUndefined();
}

async function expectPathMissing(cwd: string, path: string): Promise<void> {
  await expect(access(join(cwd, path))).rejects.toThrow();
}

describe('LotusAgents CLI', () => {
  it('exposes the expected command names', () => {
    const writers = createWriters();
    const program = buildProgram({
      cwd: process.cwd(),
      ...writers.context,
    });

    expect(program.commands.map((command) => command.name()).sort()).toEqual(['doctor', 'install', 'remove', 'update', 'validate']);
  });

  it('prints package version globally', async () => {
    const writers = createWriters();
    const result = await runCli(['node', 'lotusagents', '--version'], {
      cwd: process.cwd(),
      ...writers.context,
    });

    expect(result.exitCode).toBe(0);
    expect(writers.stdout.join('')).toMatch(/^0\.1\.0/);
  });

  it('returns a useful error outside a repository', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain('outside a Git repository');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('routes project commands inside a repository', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'doctor'], {
        cwd,
        ...writers.context,
      });

      expect(result.exitCode).toBe(0);
      expect(writers.stdout.join('')).toContain('Inspect managed Lotus project state');
      expect(writers.stdout.join('')).toContain('Manifest schema: v1');
      expect(writers.stdout.join('')).toContain('State: missing (managed-artifacts-missing)');
      expect(writers.stdout.join('')).toContain('Repository:');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('defines semantic metadata for every Lotus-managed artifact', () => {
    expect(lotusManifestSchema.parse(lotusManifest)).toEqual(lotusManifest);

    for (const artifact of managedArtifacts) {
      expect(lotusArtifactMetadataSchema.parse(artifact.metadata)).toEqual(artifact.metadata);
      expect(artifact.metadata.lotus).toBe('managed-artifact');
      expect(artifact.metadata.schemaVersion).toBe(1);
      expect(lotusArtifactMetadataSchema.parse({ ...artifact.metadata, contentVersion: '1.2.3-beta.1+build.5' }).contentVersion).toBe(
        '1.2.3-beta.1+build.5',
      );

      if (artifact.path.startsWith('.local/')) {
        expect(artifact.metadata.privacy).toBe('private');
        expect(artifact.packageTemplate.include).toBe(false);
        expect(artifact.packageTemplate.publicDocsAllowed).toBe(false);
      }
    }
  });

  it('rejects unsupported managed artifact schema versions', () => {
    const [artifact] = managedArtifacts;

    expect(
      lotusArtifactMetadataSchema.safeParse({
        ...artifact.metadata,
        schemaVersion: 2,
      }).success,
    ).toBe(false);
  });

  it('rejects manifest artifacts outside their scope namespace', () => {
    const [artifact] = managedArtifacts;

    expect(
      lotusManifestSchema.safeParse({
        ...lotusManifest,
        artifacts: [
          {
            ...artifact,
            path: '.docs/private.md',
          },
          ...managedArtifacts.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it('validates current Lotus metadata without comparing entire file content', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createManagedArtifacts(cwd);
      await createFile(
        cwd,
        '.docs/AGENTS.md',
        `---\n${JSON.stringify(managedArtifacts[5].metadata, null, 2)}\n---\n# Docs guidance\n\nCustom project notes.\n`,
      );

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: valid (managed-artifacts-valid)');
      expect(output).not.toContain('Diagnostics:');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('validates the Lotus init asset layout', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-agents.md', '.local/AGENTS.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-issues.lotus.json', '.local/issues/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-issues-notes.lotus.json', '.local/issues-notes/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-reviews.lotus.json', '.local/reviews/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-pr-notes.lotus.json', '.local/pr-notes/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/docs-agents.md', '.docs/AGENTS.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/docs-spec.lotus.json', '.docs/spec/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/meetings-draft-template.md', '.docs/meetings/_draft.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/docs-templates.lotus.json', '.docs/templates/.lotus.json');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: valid (managed-artifacts-valid)');
      expect(output).not.toContain('Diagnostics:');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports outdated Lotus metadata versions', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createManagedArtifacts(cwd, {
        '.docs/AGENTS.md': {
          contentVersion: '0.0.0',
        },
      });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: outdated (managed-artifacts-outdated)');
      expect(output).toContain(`expected v1 and content ${lotusArtifactContentVersion}`);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports legacy Lotus artifacts without metadata as outdated instead of damaged', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: outdated (managed-artifacts-outdated)');
      expect(output).toContain('Missing Lotus metadata for .docs/AGENTS.md');
      expect(output).not.toContain('State: damaged-lotus-artifact');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports partial Lotus installation when expected artifacts are missing', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createManagedArtifact(cwd, managedArtifacts[5]);

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: partially-installed (managed-artifacts-partial)');
      expect(output).toContain('Detected managed artifacts: .docs/AGENTS.md');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports damaged Lotus metadata blocks separately from unrelated content', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createManagedArtifacts(cwd);
      await createFile(cwd, '.docs/AGENTS.md', '---\nlotus: [\n---\n# Broken metadata\n\nCustom project notes.\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: damaged-lotus-artifact (artifact-metadata-invalid)');
      expect(output).toContain('Invalid Lotus metadata frontmatter');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports externally broken Codex config as out of Lotus repair scope', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createManagedArtifacts(cwd);
      await createFile(cwd, '.codex/config.toml', '[broken\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: external-corruption (external-config-invalid)');
      expect(output).toContain('outside Lotus repair scope');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('starts fresh install when no managed state exists', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Fresh install workflow.');
      expect(output).toContain('Planned changes:');
      expect(output).toContain('Keep project artifacts local');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('routes install to update when managed state exists', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await execa('node', ['-e', "require('node:fs').mkdirSync('.docs')"], { cwd });
      await execa('node', ['-e', "require('node:fs').writeFileSync('.docs/AGENTS.md', '# Project guidance\\n')"], { cwd });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Existing Lotus state detected; running update workflow.');
      expect(output).toContain('.docs/AGENTS.md');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('routes existing-state install through update action selection', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        updateAction: 'cancel',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Update canceled before applying changes.');
      expect(output).toContain('No changes applied.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('routes update without managed state into fresh install configuration', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: 'remove',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('No existing Lotus state detected; running fresh install workflow.');
      expect(output).toContain('Installation configuration:');
      expect(output).not.toContain('Existing Lotus state detected. Choose the next action.');
      expect(output).not.toContain('Remove workflow');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('prefills update configuration from detected state', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: 'update',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Installation configuration:');
      expect(output).toContain('.docs mode: committed');
      expect(output).toContain('Prefilled from detected .docs artifacts: .docs/AGENTS.md');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('supports canceling update before applying changes', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: 'cancel',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Update canceled before applying changes.');
      expect(output).toContain('No changes applied.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('removes only known Lotus-managed artifacts', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await execa('node', ['-e', "require('node:fs').mkdirSync('.docs')"], { cwd });
      await execa('node', ['-e', "require('node:fs').writeFileSync('.docs/AGENTS.md', '# Project guidance\\n')"], { cwd });
      await execa('node', ['-e', "require('node:fs').writeFileSync('README.md', '# Keep me\\n')"], { cwd });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expect(execa('node', ['-e', "require('node:fs').accessSync('.docs/AGENTS.md')"], { cwd })).rejects.toThrow();
      await expect(execa('node', ['-e', "require('node:fs').accessSync('README.md')"], { cwd })).resolves.toBeDefined();
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Removed .docs/AGENTS.md.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('detects and removes the full base Lotus artifact set', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.local/pr-notes/example.md', '# PR notes\n');
      await createFile(cwd, '.docs/meetings/_draft.md', '# Draft\n');
      await createDirectory(cwd, '.docs/templates');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: 'all',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expectPathMissing(cwd, '.local/pr-notes');
      await expectPathMissing(cwd, '.docs/meetings/_draft.md');
      await expectPathMissing(cwd, '.docs/templates');
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Removed .local/pr-notes.');
      expect(output).toContain('Removed .docs/meetings/_draft.md.');
      expect(output).toContain('Removed .docs/templates.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('removes directory-shaped managed paths recursively', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.local/issues/MAX-1.md', '# Issue\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: 'all',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expectPathMissing(cwd, '.local/issues');
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Removed .local/issues.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('does not treat paths with the wrong filesystem kind as managed artifacts', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.docs/spec', '# Not a directory\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: 'all',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expectPathExists(cwd, '.docs/spec');
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Invalid managed artifact shapes: .docs/spec (expected directory, found file)');
      expect(output).toContain('No known Lotus-managed artifacts were found for all artifacts.');
      expect(output).not.toContain('Removed .docs/spec.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('uses selected remove scope before applying changes', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });
      await createFile(cwd, '.local/AGENTS.md', '# Local guidance\n');
      await createFile(cwd, '.docs/AGENTS.md', '# Docs guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: 'docs',
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expectPathExists(cwd, '.local/AGENTS.md');
      await expectPathMissing(cwd, '.docs/AGENTS.md');
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Selected remove scope: .docs artifacts');
      expect(output).toContain('Removed .docs/AGENTS.md.');
      expect(output).not.toContain('Removed .local/AGENTS.md.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
