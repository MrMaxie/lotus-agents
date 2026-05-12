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
      expect(writers.stdout.join('')).toContain('Inspect managed Lotus project state');
      expect(writers.stdout.join('')).toContain('Repository:');
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

  it('supports canceling update before applying changes', async ({ task }) => {
    const cwd = await mkdtemp(join(tmpdir(), `lotusagents-${task.id}-`));

    try {
      await execa('git', ['init'], { cwd });

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
});
