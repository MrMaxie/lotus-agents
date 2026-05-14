import { describe, expect, it } from 'vitest';
import { runCli } from '../program';
import { cleanupTempDirectory, copyRepositoryFile, createTempRepository, createWriters } from './helpers';

describe('CLI e2e: bundled assets', () => {
  it('validates the Lotus init asset layout', async ({ task }) => {
    const cwd = await createTempRepository(task.id);

    try {
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-agents.md', '.local/AGENTS.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-issues.lotus.json', '.local/issues/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-issues-notes.lotus.json', '.local/issues-notes/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-reviews.lotus.json', '.local/reviews/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-pr-notes.lotus.json', '.local/pr-notes/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/local-workflow.md', '.local/WORKFLOW.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/docs-agents.md', '.docs/AGENTS.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/docs-spec.lotus.json', '.docs/spec/.lotus.json');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/meetings-draft-template.md', '.docs/meetings/_draft.md');
      await copyRepositoryFile(cwd, 'lotus-local/lotus-init/assets/docs-templates.lotus.json', '.docs/templates/.lotus.json');

      const installWriters = createWriters();
      await runCli(['node', 'lotusagents', 'update'], {
        cwd,
        ...installWriters.context,
      });

      const writers = createWriters();
      const result = await runCli(['node', 'lotusagents', 'validate'], {
        cwd,
        ...writers.context,
      });

      const output = writers.stdout.join('');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('State: valid (managed-artifacts-valid)');
      expect(output).not.toContain('Diagnostics:');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
