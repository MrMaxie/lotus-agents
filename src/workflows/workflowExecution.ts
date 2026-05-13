import { copyFile, lstat, mkdir, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Listr } from 'listr2';
import { removeAgentArtifacts, writeSelectedAgentArtifacts } from '../agents';
import type { ManagedArtifact } from '../manifest';
import { WorkflowMode, type WorkflowPlan } from './workflowTypes';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = basename(moduleDirectory) === 'workflows' ? join(moduleDirectory, '..', '..') : join(moduleDirectory, '..');
const reinstallAssetsByPath: Record<string, { sourcePath: string; targetFileName?: string }> = {
  '.local/AGENTS.md': { sourcePath: 'lotus-local/lotus-init/assets/local-agents.md' },
  '.local/issues': { sourcePath: 'lotus-local/lotus-init/assets/local-issues.lotus.json', targetFileName: '.lotus.json' },
  '.local/issues-notes': { sourcePath: 'lotus-local/lotus-init/assets/local-issues-notes.lotus.json', targetFileName: '.lotus.json' },
  '.local/reviews': { sourcePath: 'lotus-local/lotus-init/assets/local-reviews.lotus.json', targetFileName: '.lotus.json' },
  '.local/pr-notes': { sourcePath: 'lotus-local/lotus-init/assets/local-pr-notes.lotus.json', targetFileName: '.lotus.json' },
  '.docs/AGENTS.md': { sourcePath: 'lotus-local/lotus-init/assets/docs-agents.md' },
  '.docs/spec': { sourcePath: 'lotus-local/lotus-init/assets/docs-spec.lotus.json', targetFileName: '.lotus.json' },
  '.docs/meetings/_draft.md': { sourcePath: 'lotus-local/lotus-init/assets/meetings-draft-template.md' },
  '.docs/templates': { sourcePath: 'lotus-local/lotus-init/assets/docs-templates.lotus.json', targetFileName: '.lotus.json' },
};

export async function applyWorkflowPlan(plan: WorkflowPlan): Promise<string[]> {
  const appliedChanges: string[] = [];

  const task = new Listr(
    [
      {
        title: 'Run workflow tasks',
        task: async () => {
          if (plan.mode === WorkflowMode.ForceReinstall) {
            if (plan.repository.root === null) {
              appliedChanges.push('No repository root was available.');
              return;
            }

            for (const artifact of plan.forceReinstallArtifacts ?? []) {
              await reinstallManagedArtifact(plan.repository.root, artifact);
              appliedChanges.push(`Reinstalled ${artifact.path}.`);
            }

            return;
          }

          if (plan.mode !== WorkflowMode.Remove) {
            if (plan.repository.root !== null && plan.configuration !== undefined) {
              appliedChanges.push(
                ...(await writeSelectedAgentArtifacts(plan.repository.root, plan.configuration.agents.selectedArtifacts)),
              );
            }

            if (appliedChanges.length === 0) {
              appliedChanges.push('No filesystem changes were required for this orchestration step.');
            }

            return;
          }

          const selectedManagedPaths = plan.selectedManagedPaths ?? plan.state.managedPaths;

          if (plan.repository.root === null) {
            appliedChanges.push('No managed artifacts were present.');
            return;
          }

          if (selectedManagedPaths.length === 0) {
            appliedChanges.push('No managed artifacts were present.');
          } else {
            for (const managedPath of selectedManagedPaths) {
              const absolutePath = join(plan.repository.root, managedPath);
              const stats = await lstat(absolutePath);

              await rm(absolutePath, { force: true, recursive: stats.isDirectory() });
              appliedChanges.push(`Removed ${managedPath}.`);
            }
          }

          if (plan.shouldRemoveAgentArtifacts === true) {
            appliedChanges.push(...(await removeAgentArtifacts(plan.repository.root, plan.selectedAgentsForRemoval)));
          }
        },
      },
    ],
    {
      renderer: 'silent',
    },
  );

  await task.run();
  return appliedChanges;
}

async function reinstallManagedArtifact(root: string, artifact: ManagedArtifact): Promise<void> {
  const absolutePath = join(root, artifact.path);
  const asset = reinstallAssetsByPath[artifact.path];

  if (asset === undefined) {
    throw new Error(`Missing bundled reinstall asset for ${artifact.path}.`);
  }

  if (artifact.kind === 'directory') {
    const stats = await lstat(absolutePath).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    });

    if (stats !== null && !stats.isDirectory()) {
      await rm(absolutePath, { force: true, recursive: true });
    }

    await mkdir(absolutePath, { recursive: true });
    const targetPath = join(absolutePath, asset.targetFileName ?? '.lotus.json');

    await rm(targetPath, { force: true, recursive: true });
    await copyFile(join(packageRoot, asset.sourcePath), targetPath);

    return;
  }

  await rm(absolutePath, { force: true, recursive: true });
  await mkdir(dirname(absolutePath), { recursive: true });
  await copyFile(join(packageRoot, asset.sourcePath), absolutePath);
}
