import { describe, expect, it } from 'vitest';
import { cleanupTempDirectory, createFile, createManagedArtifact, createManagedArtifacts, createTempRepository } from './__tests__/helpers';
import { lotusArtifactContentVersion, managedArtifacts } from './manifest';
import { detectLotusState, LotusStateStatus } from './state';

const detectRepositoryState = async (cwd: string) =>
  detectLotusState({
    cwd,
    root: cwd,
    isRepository: true,
  });

describe('state', () => {
  it('validates current Lotus metadata without comparing entire file content', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);
      const docsAgentsArtifact = managedArtifact('.docs/AGENTS.md');
      await createFile(
        cwd,
        '.docs/AGENTS.md',
        `---\n${JSON.stringify(docsAgentsArtifact.metadata, null, 2)}\n---\n# Docs guidance\n\nCustom project notes.\n`,
      );

      const state = await detectRepositoryState(cwd);

      expect(state.status).toBe(LotusStateStatus.Valid);
      expect(state.diagnostics).toEqual([]);
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('reports outdated Lotus metadata versions', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd, {
        '.docs/AGENTS.md': {
          contentVersion: '0.0.0',
        },
      });

      const state = await detectRepositoryState(cwd);

      expect(state.status).toBe(LotusStateStatus.Outdated);
      expect(state.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toContain(
        `expected v1 and content ${lotusArtifactContentVersion}`,
      );
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('reports legacy Lotus artifacts without metadata as outdated instead of damaged', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/AGENTS.md', '# Project guidance\n');

      const state = await detectRepositoryState(cwd);

      expect(state.status).toBe(LotusStateStatus.Outdated);
      expect(state.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toContain('Missing Lotus metadata for .docs/AGENTS.md');
      expect(state.status).not.toBe(LotusStateStatus.DamagedLotusArtifact);
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('reports partial Lotus installation when expected artifacts are missing', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifact(cwd, managedArtifact('.docs/AGENTS.md'));

      const state = await detectRepositoryState(cwd);

      expect(state.status).toBe(LotusStateStatus.PartiallyInstalled);
      expect(state.managedPaths).toEqual(['.docs/AGENTS.md']);
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('reports damaged Lotus metadata blocks separately from unrelated content', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);
      await createFile(cwd, '.docs/AGENTS.md', '---\nlotus: [\n---\n# Broken metadata\n\nCustom project notes.\n');

      const state = await detectRepositoryState(cwd);

      expect(state.status).toBe(LotusStateStatus.DamagedLotusArtifact);
      expect(state.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toContain('Invalid Lotus metadata frontmatter');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('reports externally broken Codex config as out of Lotus repair scope', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createManagedArtifacts(cwd);
      await createFile(cwd, '.codex/config.toml', '[broken\n');

      const state = await detectRepositoryState(cwd);

      expect(state.status).toBe(LotusStateStatus.ExternalCorruption);
      expect(state.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toContain('outside Lotus repair scope');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });

  it('does not treat paths with the wrong filesystem kind as managed artifacts', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await createFile(cwd, '.docs/spec', '# Not a directory\n');

      const state = await detectRepositoryState(cwd);

      expect(state.invalidManagedPaths).toEqual([
        {
          path: '.docs/spec',
          expectedKind: 'directory',
          actualKind: 'file',
        },
      ]);
      expect(state.managedPaths).not.toContain('.docs/spec');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});

const managedArtifact = (path: string) => {
  const artifact = managedArtifacts.find((candidate) => candidate.path === path);

  if (artifact === undefined) {
    throw new Error(`Missing managed artifact fixture for ${path}.`);
  }

  return artifact;
};
