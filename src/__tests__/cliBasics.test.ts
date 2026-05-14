import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';
import { runCli } from '../program';
import {
  cleanupTempDirectory,
  createFile,
  createTempDirectory,
  createTempRepository,
  createWriters,
  expectPathExists,
  readRepositoryFile,
} from './helpers';

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
      expect(output).toContain('.docs mode: committed');
      expect(output).toContain('Installed .local/AGENTS.md.');
      expect(output).toContain('Installed .docs/AGENTS.md.');

      await expectPathExists(cwd, '.local/AGENTS.md');
      await expectPathExists(cwd, '.local/issues/.lotus.json');
      await expectPathExists(cwd, '.docs/AGENTS.md');
      await expectPathExists(cwd, '.docs/spec/.lotus.json');

      const exclude = await readRepositoryFile(cwd, '.git/info/exclude');

      expect(exclude).toContain('.local/');
      expect(exclude).not.toContain('.docs/');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('defaults .docs to local-only in repositories with tracked project files', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, 'README.md', '# Existing project\n');
      await execa('git', ['add', 'README.md'], { cwd });
      await execa('git', ['commit', '-m', 'chore: seed repository'], {
        cwd,
        env: {
          GIT_AUTHOR_NAME: 'Lotus Test',
          GIT_AUTHOR_EMAIL: 'lotus@example.com',
          GIT_COMMITTER_NAME: 'Lotus Test',
          GIT_COMMITTER_EMAIL: 'lotus@example.com',
        },
      });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });
      const output = writers.stdout.join('');
      const exclude = await readRepositoryFile(cwd, '.git/info/exclude');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('.docs mode: local-only');
      expect(exclude).toContain('.local/');
      expect(exclude).toContain('.docs/');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('writes ignore rules through the real gitdir in a linked worktree', async ({ task }) => {
    const repository = await createTempRepository(`${task.id}-repository`);
    const worktreeParent = await createTempDirectory(`${task.id}-worktree`);
    const worktree = join(worktreeParent, 'linked');

    try {
      await execa('git', ['commit', '--allow-empty', '-m', 'chore: seed repository'], {
        cwd: repository,
        env: {
          GIT_AUTHOR_NAME: 'Lotus Test',
          GIT_AUTHOR_EMAIL: 'lotus@example.com',
          GIT_COMMITTER_NAME: 'Lotus Test',
          GIT_COMMITTER_EMAIL: 'lotus@example.com',
        },
      });
      await execa('git', ['worktree', 'add', worktree], { cwd: repository });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd: worktree,
        ...writers.context,
      });
      const excludePath = await execa('git', ['rev-parse', '--git-path', 'info/exclude'], { cwd: worktree });
      const exclude = await readFile(resolve(worktree, excludePath.stdout), 'utf8');

      expect(result.exitCode).toBe(0);
      expect(exclude).toContain('.local/');
      expect(exclude).not.toContain('.docs/');
    } finally {
      await execa('git', ['worktree', 'remove', '--force', worktree], { cwd: repository }).catch(() => undefined);
      await cleanupTempDirectory(worktreeParent);
      await cleanupTempDirectory(repository);
    }
  });

  it('does not treat malformed exclude lines as valid ignore rules', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.git/info/exclude', ' .local/\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'install'], {
        cwd,
        ...writers.context,
      });
      const exclude = await readRepositoryFile(cwd, '.git/info/exclude');

      expect(result.exitCode).toBe(0);
      expect(exclude).toContain(' .local/\n.local/');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
