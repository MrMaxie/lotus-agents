import { describe, expect, it } from 'vitest';
import { runCli } from '../program';
import { cleanupTempDirectory, createTempDirectory, createTempRepository, createWriters } from './helpers';

describe('CLI e2e: basics', () => {
  it('returns a useful error outside a repository', async ({ task }) => {
    const cwd = await createTempDirectory(task.id);

    try {
      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain('outside a Git repository');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('routes project commands inside a repository', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
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
      await cleanupTempDirectory(cwd);
    }
  });

  it('starts fresh install when no managed state exists', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
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
      await cleanupTempDirectory(cwd);
    }
  });
});
