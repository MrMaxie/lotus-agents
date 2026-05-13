import { describe, expect, it } from 'vitest';
import { LotusAgent } from '../manifest';
import { runCli } from '../program';
import {
  cleanupTempDirectory,
  createDirectory,
  createFile,
  createTempRepository,
  createWriters,
  expectPathMissing,
  readRepositoryFile,
} from './helpers';

describe('CLI e2e: agent artifacts', () => {
  it('generates a single selected agent artifact', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedAgents: [LotusAgent.Claude],
        ...writers.context,
      });

      const output = writers.stdout.join('');
      const claudeMemory = await readRepositoryFile(cwd, 'CLAUDE.md');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Selected agents: claude');
      expect(claudeMemory).toContain('lotus: managed-agent-artifact');
      expect(claudeMemory).toContain('selectedAgents:\n  - claude');
      expect(claudeMemory).toContain('`.local/AGENTS.md`');
      await expectPathMissing(cwd, 'AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('uses a common AGENTS.md artifact for Codex and OpenCode selections', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedAgents: [LotusAgent.Codex, LotusAgent.Opencode, LotusAgent.Cursor],
        ...writers.context,
      });

      const sharedAgents = await readRepositoryFile(cwd, 'AGENTS.md');
      const cursorRule = await readRepositoryFile(cwd, '.cursor/rules/lotus.mdc');

      expect(result.exitCode).toBe(0);
      expect(sharedAgents).toContain('artifactKind: shared-agents');
      expect(sharedAgents).toContain('  - codex');
      expect(sharedAgents).toContain('  - opencode');
      expect(cursorRule).toContain('artifactKind: cursor-rule');
      expect(cursorRule).toContain('  - cursor');
      await expectPathMissing(cwd, 'CLAUDE.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('selects all detected agents when recommended agent artifacts are requested', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, 'AGENTS.md', '# Existing AGENTS instructions\n');
      await createDirectory(cwd, '.claude');
      await createDirectory(cwd, '.cursor');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectRecommendedAgents: true,
        ...writers.context,
      });

      const output = writers.stdout.join('');
      const sharedAgents = await readRepositoryFile(cwd, 'AGENTS.md');
      const claudeMemory = await readRepositoryFile(cwd, 'CLAUDE.md');
      const cursorRule = await readRepositoryFile(cwd, '.cursor/rules/lotus.mdc');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Detected agents: codex');
      expect(output).toContain('Selected agents: codex, opencode, claude, cursor');
      expect(output).toContain('Skipped AGENTS.md; an existing non-Lotus file is present.');
      expect(sharedAgents).toContain('Existing AGENTS instructions');
      expect(claudeMemory).toContain('  - claude');
      expect(cursorRule).toContain('  - cursor');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('supports explicit no-agent selection even when agents are detected', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createDirectory(cwd, '.cursor');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        noAgentArtifacts: true,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Detected agents: cursor');
      expect(output).toContain('Selected agents: none');
      await expectPathMissing(cwd, '.cursor/rules/lotus.mdc');
      await expectPathMissing(cwd, 'AGENTS.md');
      await expectPathMissing(cwd, 'CLAUDE.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('removes selected agents from shared artifacts independently', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      const installWriters = createWriters();
      await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        selectedAgents: [LotusAgent.Codex, LotusAgent.Opencode],
        ...installWriters.context,
      });

      const removeWriters = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        selectedAgents: [LotusAgent.Opencode],
        ...removeWriters.context,
      });

      const output = removeWriters.stdout.join('');
      const sharedAgents = await readRepositoryFile(cwd, 'AGENTS.md');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Updated AGENTS.md; retained codex.');
      expect(sharedAgents).toContain('  - codex');
      expect(sharedAgents).not.toContain('  - opencode');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
