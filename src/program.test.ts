import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';
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
      expect(writers.stdout.join('')).toContain('Doctor routing is ready');
      expect(writers.stdout.join('')).toContain('Repository:');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
