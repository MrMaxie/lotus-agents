import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';
import { lotusArtifactMetadataSchema, lotusManifest, lotusManifestSchema, managedArtifacts } from './manifest.js';
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
      expect(artifact.metadata.contentVersion).toMatch(/^\d+\.\d+\.\d+$/);

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
