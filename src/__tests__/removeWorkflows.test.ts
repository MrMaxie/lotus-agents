import { join } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';
import { runCli } from '../program';
import { RemoveScope } from '../types';
import {
  cleanupTempDirectory,
  createDirectory,
  createDirectoryLink,
  createFile,
  createFileLink,
  createTempDirectory,
  createTempRepository,
  createWriters,
  expectPathExists,
  expectPathMissing,
  readRepositoryFile,
} from './helpers';

describe('CLI e2e: remove workflows', () => {
  it('removes only known Lotus-managed artifacts', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');
      await createFile(cwd, 'README.md', '# Keep me\n');

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
      await cleanupTempDirectory(cwd);
    }
  });

  it('detects and removes the full base Lotus artifact set', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.local/pr-notes/example.md', '# PR notes\n');
      await createFile(cwd, '.docs/meetings/_draft.md', '# Draft\n');
      await createDirectory(cwd, '.docs/templates');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: RemoveScope.All,
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
      await cleanupTempDirectory(cwd);
    }
  });

  it('removes directory-shaped managed paths recursively', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.local/issues/MAX-1.md', '# Issue\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: RemoveScope.All,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expectPathMissing(cwd, '.local/issues');
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Removed .local/issues.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('does not remove paths with the wrong filesystem kind', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/spec', '# Not a directory\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: RemoveScope.All,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      await expectPathExists(cwd, '.docs/spec');
      expect(result.exitCode).toBe(0);
      expect(output).toContain('Invalid managed artifact shapes: .docs/spec (expected directory, found file)');
      expect(output).toContain('No known Lotus-managed artifacts were found for all artifacts.');
      expect(output).not.toContain('Removed .docs/spec.');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('uses selected remove scope before applying changes', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.local/AGENTS.md', '# Local guidance\n');
      await createFile(cwd, '.docs/AGENTS.md', '# Docs guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: RemoveScope.Docs,
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
      await cleanupTempDirectory(cwd);
    }
  });

  it('blocks removal when a managed path resolves outside the repository', async ({ task }) => {
    const cwd = await createTempRepository(task.id);
    const externalRoot = await createTempDirectory(`${task.id}-external`);

    try {
      await createFile(externalRoot, 'AGENTS.md', '# External local guidance\n');
      await createDirectoryLink(cwd, '.local', externalRoot);
      await createFile(cwd, '.docs/AGENTS.md', '# Docs guidance\n');

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: RemoveScope.All,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain(
        'Refusing to remove .local/AGENTS.md: .local resolves outside the repository. No files were changed.',
      );
      expect(await readRepositoryFile(externalRoot, 'AGENTS.md')).toBe('# External local guidance\n');
      await expectPathExists(cwd, '.docs/AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
      await cleanupTempDirectory(externalRoot);
    }
  });

  it('blocks removal through a final in-repository symbolic link', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, 'notes.md', '# Keep me\n');
      await createFileLink(cwd, '.docs/AGENTS.md', join(cwd, 'notes.md'));

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'remove'], {
        cwd,
        removeScope: RemoveScope.Docs,
        ...writers.context,
      });

      expect(result.exitCode).toBe(1);
      expect(writers.stderr.join('')).toContain(
        'Refusing to remove .docs/AGENTS.md: .docs/AGENTS.md is a symbolic link or junction. No files were changed.',
      );
      expect(await readRepositoryFile(cwd, 'notes.md')).toBe('# Keep me\n');
      await expectPathExists(cwd, '.docs/AGENTS.md');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
