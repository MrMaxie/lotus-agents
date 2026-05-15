import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LotusProfile } from '../manifest';
import { runCli } from '../program';
import { WorkflowAction } from '../types';
import { SourceOfTruthMode, TaskSource, workflowConfigSchema } from '../workflowConfig';
import {
  cleanupTempDirectory,
  createManagedArtifacts,
  createTempRepository,
  createWriters,
  expectPathExists,
  expectPathMissing,
  readRepositoryFile,
} from './helpers';

describe('CLI e2e: fixture matrix', () => {
  it('installs local-first profile artifacts and workflow config', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LocalFirst],
        ...writers.context,
      });
      const workflowConfig = workflowConfigSchema.parse(JSON.parse(await readRepositoryFile(cwd, '.local/workflow.lotus.json')));

      expect(result.exitCode).toBe(0);
      expect(workflowConfig.selectedProfiles).toEqual([LotusProfile.LocalFirst]);
      await expectPathExists(cwd, '.local/AGENTS.md');
      await expectPathExists(cwd, '.local/WORKFLOW.md');
      await expectPathExists(cwd, '.docs/AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('installs linear-first profile artifacts with local configuration and durable guidance', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LinearFirst],
        ...writers.context,
      });
      const workflowConfig = workflowConfigSchema.parse(JSON.parse(await readRepositoryFile(cwd, '.local/workflow.lotus.json')));

      expect(result.exitCode).toBe(0);
      expect(workflowConfig.selectedProfiles).toEqual([LotusProfile.LinearFirst]);
      expect(workflowConfig.taskSources).toEqual([]);
      expect(workflowConfig.sourcePriority).toEqual([]);
      expect(workflowConfig.profileSemantics?.linearFirst.localCompatibilityStores).toBe('not-installed');
      expect(workflowConfig.connectorReadiness?.linear.whenUnavailable).toContain('ask the human to connect Linear');
      await expectPathExists(cwd, '.local/AGENTS.md');
      await expectPathExists(cwd, '.local/issues-notes/.lotus.json');
      await expectPathMissing(cwd, '.local/issues/.lotus.json');
      await expectPathMissing(cwd, '.local/reviews/.lotus.json');
      await expectPathMissing(cwd, '.local/pr-notes/.lotus.json');
      await expectPathExists(cwd, '.docs/AGENTS.md');
      await expectPathExists(cwd, '.docs/spec/.lotus.json');
      expect(writers.stdout.join('')).toContain(
        'Linear-first operational state: Linear issues, Linear comments; compatibility stores are not-installed',
      );

      const validateWriters = createWriters();
      const validateResult = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...validateWriters.context,
      });

      expect(validateResult.exitCode).toBe(0);
      expect(validateWriters.stdout.join('')).toContain('State: valid (managed-artifacts-valid)');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('supports both profiles and configured task source modes', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LocalFirst, LotusProfile.LinearFirst],
        selectedTaskSources: [TaskSource.LinearIssuesConnector, TaskSource.Figma],
        taskSourceModes: {
          [TaskSource.LinearIssuesConnector]: SourceOfTruthMode.Operational,
          [TaskSource.Figma]: SourceOfTruthMode.Readonly,
        },
        writeEnabledTaskSources: [TaskSource.LinearIssuesConnector],
        ...writers.context,
      });
      const workflowConfig = workflowConfigSchema.parse(JSON.parse(await readRepositoryFile(cwd, '.local/workflow.lotus.json')));
      const linearSource = workflowConfig.taskSources.find((source) => source.source === TaskSource.LinearIssuesConnector);
      const figmaSource = workflowConfig.taskSources.find((source) => source.source === TaskSource.Figma);

      expect(result.exitCode).toBe(0);
      expect(workflowConfig.selectedProfiles).toEqual([LotusProfile.LocalFirst, LotusProfile.LinearFirst]);
      expect(workflowConfig.sourcePriority).toEqual([
        TaskSource.LocalNotes,
        TaskSource.LocalFollowUps,
        TaskSource.LocalReviews,
        TaskSource.LocalFindings,
        TaskSource.LinearIssuesConnector,
        TaskSource.Figma,
      ]);
      expect(linearSource).toMatchObject({
        mode: SourceOfTruthMode.Operational,
        writesAllowed: true,
        detailsPath: '.local/WORKFLOW.md',
      });
      expect(figmaSource).toMatchObject({
        mode: SourceOfTruthMode.Readonly,
        writesAllowed: false,
        detailsPath: '.local/WORKFLOW.md',
      });
      expect(workflowConfig.connectorReadiness?.linear.whenConfigured).toContain('linear-issues-connector');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('uses write-enabled remote sources as read-write by default', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LocalFirst],
        selectedTaskSources: [TaskSource.GitHubIssuesConnector],
        writeEnabledTaskSources: [TaskSource.GitHubIssuesConnector],
        ...writers.context,
      });
      const workflowConfig = workflowConfigSchema.parse(JSON.parse(await readRepositoryFile(cwd, '.local/workflow.lotus.json')));
      const githubSource = workflowConfig.taskSources.find((source) => source.source === TaskSource.GitHubIssuesConnector);

      expect(result.exitCode).toBe(0);
      expect(githubSource).toMatchObject({
        mode: SourceOfTruthMode.ReadWrite,
        writesAllowed: true,
        detailsPath: '.local/WORKFLOW.md',
      });
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('rejects write-enabled sources that were not selected', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install', '--write-source', 'github-issues-connector'], {
        cwd,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain('--write-source requires selected task sources');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('treats no selected profile as profile artifact removal', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        updateAction: WorkflowAction.Update,
        selectedProfiles: [],
        ...writers.context,
      });
      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('No Lotus profiles were selected; removing profile artifacts.');
      await expectPathMissing(cwd, '.local/AGENTS.md');
      await expectPathMissing(cwd, '.docs/AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('supports no profile selection through the CLI option', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'update', '--no-profiles'], {
        cwd,
        updateAction: WorkflowAction.Update,
        ...writers.context,
      });

      expect(result.exitCode).toBe(0);
      expect(writers.stdout.join('')).toContain('No Lotus profiles were selected; removing profile artifacts.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('reports damaged workflow config semantics', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedProfiles: [LotusProfile.LocalFirst],
        ...createWriters().context,
      });

      const workflowConfig = workflowConfigSchema.parse(JSON.parse(await readRepositoryFile(cwd, '.local/workflow.lotus.json')));
      await writeFile(
        join(cwd, '.local/workflow.lotus.json'),
        `${JSON.stringify({ ...workflowConfig, sourcePriority: [TaskSource.LocalNotes, TaskSource.LocalNotes] }, null, 2)}\n`,
      );

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      expect(result.exitCode).toBe(0);
      expect(writers.stdout.join('')).toContain('Invalid Lotus workflow config');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
