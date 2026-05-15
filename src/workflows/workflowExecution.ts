import { copyFile, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { Listr } from 'listr2';
import { removeAgentArtifacts, writeSelectedAgentArtifacts } from '../agents';
import { LotusProfile, type ManagedArtifact, ManagedArtifactType, managedArtifacts } from '../manifest';
import { DocsMode } from '../projectCommands';
import { resolveSafeManagedPaths } from '../utils/managedPathSafety';
import { createWorkflowConfig, normalizeTaskSources, renderWorkflowConfig } from '../workflowConfig';
import { WorkflowMode, type WorkflowPlan } from './workflowTypes';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = basename(moduleDirectory) === 'workflows' ? join(moduleDirectory, '..', '..') : join(moduleDirectory, '..');
const reinstallAssetsByPath: Record<string, { sourcePath: string; targetFileName?: string }> = {
  '.local/AGENTS.md': { sourcePath: 'lotus-local/lotus-init/assets/local-agents.md' },
  '.local/issues': { sourcePath: 'lotus-local/lotus-init/assets/local-issues.lotus.json', targetFileName: '.lotus.json' },
  '.local/issues-notes': { sourcePath: 'lotus-local/lotus-init/assets/local-issues-notes.lotus.json', targetFileName: '.lotus.json' },
  '.local/reviews': { sourcePath: 'lotus-local/lotus-init/assets/local-reviews.lotus.json', targetFileName: '.lotus.json' },
  '.local/pr-notes': { sourcePath: 'lotus-local/lotus-init/assets/local-pr-notes.lotus.json', targetFileName: '.lotus.json' },
  '.local/WORKFLOW.md': { sourcePath: 'lotus-local/lotus-init/assets/local-workflow.md' },
  '.docs/AGENTS.md': { sourcePath: 'lotus-local/lotus-init/assets/docs-agents.md' },
  '.docs/spec': { sourcePath: 'lotus-local/lotus-init/assets/docs-spec.lotus.json', targetFileName: '.lotus.json' },
  '.docs/meetings/_draft.md': { sourcePath: 'lotus-local/lotus-init/assets/meetings-draft-template.md' },
  '.docs/templates': { sourcePath: 'lotus-local/lotus-init/assets/docs-templates.lotus.json', targetFileName: '.lotus.json' },
};

export const applyWorkflowPlan = async (plan: WorkflowPlan): Promise<string[]> => {
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

            const safePaths = await resolveSafeManagedPaths(
              plan.repository.root,
              (plan.forceReinstallArtifacts ?? []).map((artifact) => artifact.path),
              'write',
            );

            for (const artifact of plan.forceReinstallArtifacts ?? []) {
              await reinstallManagedArtifact(plan.repository.root, artifact, plan.state.selectedProfiles, safePaths);
              appliedChanges.push(`Reinstalled ${artifact.path}.`);
            }

            appliedChanges.push(...(await ensureGitInfoExclude(plan.repository.root, ['.local/'])));
            return;
          }

          if (plan.mode !== WorkflowMode.Remove) {
            if (plan.repository.root !== null && plan.configuration !== undefined) {
              const managedArtifactsToInstall = getManagedArtifactsToInstall(plan);
              const workflowConfigArtifact = getWorkflowConfigArtifact(plan);
              await resolveSafeManagedPaths(
                plan.repository.root,
                plan.configuration.agents.selectedArtifacts.map((artifact) => artifact.path),
                'write',
              );
              const safePaths = await resolveSafeManagedPaths(
                plan.repository.root,
                [
                  ...managedArtifactsToInstall.map((artifact) => artifact.path),
                  ...(workflowConfigArtifact !== null ? [workflowConfigArtifact.path] : []),
                ],
                'write',
              );

              for (const artifact of managedArtifactsToInstall) {
                appliedChanges.push(await installManagedArtifact(plan.repository.root, artifact, safePaths));
              }

              if (workflowConfigArtifact !== null) {
                await writeWorkflowConfigArtifact(plan.repository.root, plan, safePaths, workflowConfigArtifact);
                appliedChanges.push(`Updated ${workflowConfigArtifact.path}.`);
              }

              appliedChanges.push(...(await ensureGitInfoExclude(plan.repository.root, getRequiredExcludePatterns(plan))));
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
            const safePaths = await resolveSafeManagedPaths(plan.repository.root, selectedManagedPaths, 'remove');

            for (const managedPath of selectedManagedPaths) {
              const absolutePath = safePaths.get(managedPath) ?? join(plan.repository.root, managedPath);
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
};

const reinstallManagedArtifact = async (
  root: string,
  artifact: ManagedArtifact,
  selectedProfiles: LotusProfile[] | null,
  safePaths: Map<string, string>,
): Promise<void> => {
  const absolutePath = safePaths.get(artifact.path) ?? join(root, artifact.path);
  const asset = reinstallAssetsByPath[artifact.path];

  if (artifact.metadata.artifactType === ManagedArtifactType.ProjectWorkflowConfig) {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, renderWorkflowConfig(createDefaultWorkflowConfig(artifact, selectedProfiles)));
    return;
  }

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
};

const installManagedArtifact = async (root: string, artifact: ManagedArtifact, safePaths: Map<string, string>): Promise<string> => {
  const absolutePath = safePaths.get(artifact.path) ?? join(root, artifact.path);
  const asset = reinstallAssetsByPath[artifact.path];

  if (asset === undefined) {
    if (artifact.metadata.artifactType === ManagedArtifactType.ProjectWorkflowConfig) {
      const stats = await lstat(absolutePath).catch((error: unknown) => {
        if (isMissingPathError(error)) {
          return null;
        }

        throw error;
      });

      if (stats !== null) {
        return `Skipped ${artifact.path}; an existing path is present.`;
      }

      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, renderWorkflowConfig(createDefaultWorkflowConfig(artifact)));
      return `Installed ${artifact.path}.`;
    }

    throw new Error(`Missing bundled install asset for ${artifact.path}.`);
  }

  const stats = await lstat(absolutePath).catch((error: unknown) => {
    if (isMissingPathError(error)) {
      return null;
    }

    throw error;
  });

  if (stats !== null) {
    return `Skipped ${artifact.path}; an existing path is present.`;
  }

  if (artifact.kind === 'directory') {
    await mkdir(absolutePath, { recursive: true });
    await copyFile(join(packageRoot, asset.sourcePath), join(absolutePath, asset.targetFileName ?? '.lotus.json'));
    return `Installed ${artifact.path}.`;
  }

  await mkdir(dirname(absolutePath), { recursive: true });
  await copyFile(join(packageRoot, asset.sourcePath), absolutePath);

  return `Installed ${artifact.path}.`;
};

const getManagedArtifactsToInstall = (plan: WorkflowPlan): ManagedArtifact[] => {
  const artifactsForSelectedProfiles = filterArtifactsBySelectedProfiles(managedArtifacts, plan);

  if (plan.mode === WorkflowMode.FreshInstall) {
    return artifactsForSelectedProfiles;
  }

  if (plan.mode === WorkflowMode.DetectedUpdate || plan.mode === WorkflowMode.ExplicitUpdate) {
    return artifactsForSelectedProfiles.filter((artifact) => plan.state.missingManagedPaths.includes(artifact.path));
  }

  return [];
};

const filterArtifactsBySelectedProfiles = (artifacts: ManagedArtifact[], plan: WorkflowPlan): ManagedArtifact[] => {
  const selectedProfiles = new Set(plan.configuration?.selectedProfiles ?? []);

  if (selectedProfiles.size === 0) {
    return [];
  }

  return artifacts.filter((artifact) => artifact.metadata.selectedProfiles.some((profile) => selectedProfiles.has(profile)));
};

const getWorkflowConfigArtifact = (plan: WorkflowPlan): ManagedArtifact | null => {
  const artifact = managedArtifacts.find((candidate) => candidate.metadata.artifactType === ManagedArtifactType.ProjectWorkflowConfig);

  if (
    artifact === undefined ||
    plan.configuration === undefined ||
    !filterArtifactsBySelectedProfiles([artifact], plan).includes(artifact)
  ) {
    return null;
  }

  return artifact;
};

const writeWorkflowConfigArtifact = async (
  root: string,
  plan: WorkflowPlan,
  safePaths: Map<string, string>,
  artifact: ManagedArtifact,
): Promise<void> => {
  const configuration = plan.configuration;

  if (configuration === undefined) {
    return;
  }

  const absolutePath = safePaths.get(artifact.path) ?? join(root, artifact.path);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, renderWorkflowConfig(configuration.workflowConfig));
};

const createDefaultWorkflowConfig = (artifact: ManagedArtifact, selectedProfiles: LotusProfile[] | null = null) => ({
  ...createWorkflowConfig({
    metadata: artifact.metadata,
    selectedProfiles: selectedProfiles !== null && selectedProfiles.length > 0 ? selectedProfiles : [LotusProfile.LocalFirst],
    taskSources: normalizeTaskSources([], {}, []),
  }),
});

const getRequiredExcludePatterns = (plan: WorkflowPlan): string[] => {
  const patterns = ['.local/'];

  if (plan.configuration?.docsMode === DocsMode.LocalOnly) {
    patterns.push('.docs/');
  }

  return patterns;
};

const ensureGitInfoExclude = async (root: string, patterns: string[]): Promise<string[]> => {
  const excludePath = await resolveGitPath(root, 'info/exclude');
  const existingContent = await readFile(excludePath, 'utf8').catch((error: unknown) => {
    if (isMissingPathError(error)) {
      return '';
    }

    throw error;
  });
  const existingPatterns = new Set(existingContent.split(/\r?\n/));
  const missingPatterns = patterns.filter((pattern) => !existingPatterns.has(pattern));

  if (missingPatterns.length === 0) {
    return [];
  }

  await mkdir(dirname(excludePath), { recursive: true });
  const separator = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';

  await writeFile(excludePath, `${existingContent}${separator}${missingPatterns.join('\n')}\n`);

  return missingPatterns.map((pattern) => `Ensured ${pattern} is listed in .git/info/exclude.`);
};

const resolveGitPath = async (root: string, gitPath: string): Promise<string> => {
  const result = await execa('git', ['rev-parse', '--git-path', gitPath], {
    cwd: root,
    reject: true,
  });

  return resolve(root, result.stdout);
};

const isMissingPathError = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'ENOENT';
