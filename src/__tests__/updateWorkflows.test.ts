import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProjectCommand, projectCommandSchema } from '../commands';
import { LotusProfile, lotusArtifactContentVersion, managedArtifacts } from '../manifest';
import { runCli } from '../program';
import { WorkflowAction } from '../types';
import { workflowConfigSchema } from '../workflowConfig';
import {
  cleanupTempDirectory,
  createDirectoryLink,
  createFile,
  createManagedArtifact,
  createManagedArtifacts,
  createTempDirectory,
  createTempRepository,
  createWriters,
  expectPathExists,
  expectPathMissing,
  readRepositoryFile,
} from './helpers';

describe('CLI e2e: update and validation workflows', () => {
  const managedArtifact = (path: string) => {
    const artifact = managedArtifacts.find((candidate) => candidate.path === path);

    if (artifact === undefined) {
      throw new Error(`Missing managed artifact fixture for ${path}.`);
    }

    return artifact;
  };

  it('reports outdated Lotus metadata versions', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
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
      await cleanupTempDirectory(cwd);
    }
  });

  it('routes damaged Lotus artifacts to repair guidance without overwriting by default', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);

      const damagedContent = '---\nlotus: [\n---\n# Broken metadata\n\nCustom project notes.\n';
      await createFile(cwd, '.docs/AGENTS.md', damagedContent);

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        ...writers.context,
      });

      const output = writers.stdout.join('');
      const currentContent = await readRepositoryFile(cwd, '.docs/AGENTS.md');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Repair workflow required for damaged Lotus-managed artifacts.');
      expect(output).toContain('lotusagents update --force');
      expect(output).toContain('Forced reinstall will replace user-editable managed artifacts');
      expect(currentContent).toBe(damagedContent);
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('routes damaged directory manifests to repair guidance without reinstalling by default', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);
      await rm(join(cwd, '.docs/spec/.lotus.json'), { recursive: true, force: true });
      await createFile(cwd, '.docs/spec/.lotus.json/nested.md', '# Wrong metadata shape\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Repair workflow required for damaged Lotus-managed artifacts.');
      expect(output).toContain('.docs/spec');
      expect(output).toContain('lotusagents update --force');
      expect(output).not.toContain('Reinstalled .docs/spec.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('force reinstalls known Lotus artifacts from bundled templates', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);
      await createFile(cwd, '.docs/AGENTS.md', '---\nlotus: [\n---\n# Broken metadata\n');
      await createFile(cwd, '.docs/spec/_toc.md', '# Spec index\n\nKeep this project state.\n');
      await createFile(cwd, '.docs/templates/spec.md', '# Project spec template\n');
      await createFile(cwd, '.local/issues/MAX-1.md', '# Local issue notes\n');
      await rm(join(cwd, '.docs/spec/.lotus.json'), { recursive: true, force: true });
      await createFile(cwd, '.docs/spec/.lotus.json/nested.md', '# Wrong metadata shape\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        forceReinstall: true,
        ...writers.context,
      });

      const output = writers.stdout.join('');
      const docsAgents = await readRepositoryFile(cwd, '.docs/AGENTS.md');
      const specManifest = await readRepositoryFile(cwd, '.docs/spec/.lotus.json');
      const specIndex = await readRepositoryFile(cwd, '.docs/spec/_toc.md');
      const specTemplate = await readRepositoryFile(cwd, '.docs/templates/spec.md');
      const issueNotes = await readRepositoryFile(cwd, '.local/issues/MAX-1.md');
      const exclude = await readRepositoryFile(cwd, '.git/info/exclude');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Forced reinstall workflow.');
      expect(output).toContain('Warn before replacing user-editable managed artifacts');
      expect(output).toContain('Reinstalled .docs/AGENTS.md.');
      expect(docsAgents).toContain('# Durable Agent Rules');
      expect(specManifest).toContain('"artifactType": "spec-store"');
      expect(specIndex).toContain('Keep this project state.');
      expect(specTemplate).toContain('Project spec template');
      expect(issueNotes).toContain('Local issue notes');
      expect(exclude).toContain('.local/');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('force reinstall respects the installed workflow profile', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LinearFirst],
        ...createWriters().context,
      });
      await createFile(cwd, '.local/AGENTS.md', '---\nlotus: [\n---\n# Broken metadata\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        forceReinstall: true,
        ...writers.context,
      });
      const output = writers.stdout.join('');
      const workflowConfig = workflowConfigSchema.parse(JSON.parse(await readRepositoryFile(cwd, '.local/workflow.lotus.json')));

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Forced reinstall workflow.');
      expect(output).toContain('Reinstalled .local/AGENTS.md.');
      expect(output).toContain('Reinstalled .docs/AGENTS.md.');
      expect(workflowConfig.selectedProfiles).toEqual([LotusProfile.LinearFirst]);
      await expectPathExists(cwd, '.docs/AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('removes all present managed artifacts when profiles are cleared', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LocalFirst],
        ...createWriters().context,
      });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        selectedProfiles: [],
        ...writers.context,
      });

      expect(result.exitCode).toBe(0);
      expect(writers.stdout.join('')).toContain('No Lotus profiles were selected; removing profile artifacts.');
      await expectPathMissing(cwd, '.local/AGENTS.md');
      await expectPathMissing(cwd, '.local/workflow.lotus.json');
      await expectPathMissing(cwd, '.docs/AGENTS.md');
      await expectPathMissing(cwd, '.docs/spec');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('keeps fresh install available when only external configuration is broken', async ({ task }) => {
    for (const command of projectCommandSchema.options.filter(
      (projectCommand) => projectCommand === ProjectCommand.Install || projectCommand === ProjectCommand.Update,
    )) {
      const cwd = await createTempRepository(`${task.id}-${command}`);

      try {
        await createFile(cwd, '.codex/config.toml', '[broken\n');

        const writers = createWriters();
        const result = await runCli(['node', 'lotusagents', command], {
          cwd,
          updateAction: WorkflowAction.Update,
          forceReinstall: true,
          ...writers.context,
        });

        const output = writers.stdout.join('');

        expect(result.exitCode).toBe(0);
        expect(output).toContain(
          command === ProjectCommand.Install
            ? 'Fresh install workflow.'
            : 'No existing Lotus state detected; running fresh install workflow.',
        );
        expect(output).not.toContain('External configuration is broken outside Lotus repair scope.');
        expect(output).not.toContain('No Lotus repair changes applied.');
      } finally {
        await cleanupTempDirectory(cwd);
      }
    }
  });

  it('blocks update and force repair when external configuration is broken', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);
      await createFile(cwd, '.codex/config.toml', '[broken\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        forceReinstall: true,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('External configuration is broken outside Lotus repair scope.');
      expect(output).toContain('external-config-invalid');
      expect(output).toContain('No Lotus repair changes applied.');
      expect(output).not.toContain('Reinstalled .docs/AGENTS.md.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('routes install to update when managed state exists', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

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
      await cleanupTempDirectory(cwd);
    }
  });

  it('routes existing-state install through update action selection', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        updateAction: WorkflowAction.Cancel,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Update canceled before applying changes.');
      expect(output).toContain('No changes applied.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('routes update without managed state into fresh install configuration', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Remove,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('No existing Lotus state detected; running fresh install workflow.');
      expect(output).toContain('Installation configuration:');
      expect(output).not.toContain('Existing Lotus state detected. Choose the next action.');
      expect(output).not.toContain('Remove workflow');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('prefills update configuration from detected state', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Installation configuration:');
      expect(output).toContain('.docs mode: committed');
      expect(output).toContain('Prefilled from detected .docs artifacts: .docs/AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('installs missing managed artifacts during update without replacing present artifacts', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifact(cwd, managedArtifact('.docs/AGENTS.md'));

      const existingDocsAgents = await readRepositoryFile(cwd, '.docs/AGENTS.md');
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        ...writers.context,
      });

      const output = writers.stdout.join('');
      const currentDocsAgents = await readRepositoryFile(cwd, '.docs/AGENTS.md');
      const exclude = await readRepositoryFile(cwd, '.git/info/exclude');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Installed .local/AGENTS.md.');
      expect(output).toContain('Installed .docs/spec.');
      expect(currentDocsAgents).toBe(existingDocsAgents);
      expect(exclude).toContain('.local/');
      expect(exclude).not.toContain('.docs/');
      await expectPathExists(cwd, '.local/issues/.lotus.json');
      await expectPathExists(cwd, '.docs/spec/.lotus.json');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('blocks install when a managed parent path resolves outside the repository', async ({ task }) => {
    const cwd = await createTempRepository(task.id);
    const externalRoot = await createTempDirectory(`${task.id}-external`);

    try {
      await createFile(externalRoot, 'AGENTS.md', '# External local guidance\n');
      await createDirectoryLink(cwd, '.local', externalRoot);

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain('Refusing to write .local/');
      expect(writers.stderr.join('')).toContain('.local resolves outside the repository. No files were changed.');
      expect(await readRepositoryFile(externalRoot, 'AGENTS.md')).toBe('# External local guidance\n');
      await expectPathMissing(cwd, '.docs/AGENTS.md');
      await expectPathMissing(cwd, '.local/workflow.lotus.json');
    } finally {
      await cleanupTempDirectory(cwd);
      await cleanupTempDirectory(externalRoot);
    }
  });

  it('blocks update when a missing managed artifact would write through an external link', async ({ task }) => {
    const cwd = await createTempRepository(task.id);
    const externalRoot = await createTempDirectory(`${task.id}-external`);

    try {
      await createManagedArtifact(cwd, managedArtifact('.docs/AGENTS.md'));
      await createFile(externalRoot, 'AGENTS.md', '# External local guidance\n');
      await createDirectoryLink(cwd, '.local', externalRoot);

      const existingDocsAgents = await readRepositoryFile(cwd, '.docs/AGENTS.md');
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain('Refusing to write .local/');
      expect(writers.stderr.join('')).toContain('.local resolves outside the repository. No files were changed.');
      expect(await readRepositoryFile(cwd, '.docs/AGENTS.md')).toBe(existingDocsAgents);
      expect(await readRepositoryFile(externalRoot, 'AGENTS.md')).toBe('# External local guidance\n');
      await expectPathMissing(cwd, '.local/workflow.lotus.json');
    } finally {
      await cleanupTempDirectory(cwd);
      await cleanupTempDirectory(externalRoot);
    }
  });

  it('blocks forced reinstall when a managed path resolves outside the repository', async ({ task }) => {
    const cwd = await createTempRepository(task.id);
    const externalRoot = await createTempDirectory(`${task.id}-external`);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '---\nlotus: [\n---\n# Broken metadata\n');
      await createFile(externalRoot, 'AGENTS.md', '# External local guidance\n');
      await createDirectoryLink(cwd, '.local', externalRoot);

      const damagedDocsAgents = await readRepositoryFile(cwd, '.docs/AGENTS.md');
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        forceReinstall: true,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain('Refusing to write .local/');
      expect(writers.stderr.join('')).toContain('.local resolves outside the repository. No files were changed.');
      expect(await readRepositoryFile(cwd, '.docs/AGENTS.md')).toBe(damagedDocsAgents);
      expect(await readRepositoryFile(externalRoot, 'AGENTS.md')).toBe('# External local guidance\n');
    } finally {
      await cleanupTempDirectory(cwd);
      await cleanupTempDirectory(externalRoot);
    }
  });

  it('supports canceling update before applying changes', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Cancel,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Update canceled before applying changes.');
      expect(output).toContain('No changes applied.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
