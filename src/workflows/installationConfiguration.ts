import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execa } from 'execa';
import { createAgentConfiguration } from '../agents';
import { getManagedArtifact, LotusProfile, ManagedArtifactScope, ManagedArtifactType, managedArtifacts } from '../manifest';
import { DocsMode } from '../projectCommands';
import type { LotusState } from '../state';
import type { CommandContext, RepositoryState } from '../types';
import { createWorkflowConfig, normalizeTaskSources, workflowConfigSchema } from '../workflowConfig';
import { resolveSelectedProfiles, resolveSelectedTaskSources, resolveTaskSourceModes } from './workflowPrompts';
import type { InstallationConfiguration } from './workflowTypes';

export const createInstallationConfiguration = async (
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
): Promise<InstallationConfiguration> => {
  const detectedDocsArtifacts = state.managedPaths.filter(
    (managedPath) => getManagedArtifact(managedPath)?.scope === ManagedArtifactScope.Docs,
  );
  const agents =
    repository.root === null
      ? {
          detections: [],
          selectedAgents: [],
          selectedArtifacts: [],
        }
      : await createAgentConfiguration(repository.root, context);
  const prefilledProfiles = await resolvePrefilledProfiles(repository.root, state);
  const selectedProfiles = await resolveSelectedProfiles(context, prefilledProfiles);
  const selectedTaskSources = await resolveSelectedTaskSources(context);
  const taskSourceModes = await resolveTaskSourceModes(context, selectedTaskSources);
  const taskSources = normalizeTaskSources(selectedProfiles, selectedTaskSources, taskSourceModes, context.writeEnabledTaskSources);
  const workflowConfig = createWorkflowConfig({
    metadata: getWorkflowConfigArtifact().metadata,
    selectedProfiles,
    taskSources,
  });

  return {
    docsMode: await resolveDocsMode(repository.root, detectedDocsArtifacts),
    detectedDocsArtifacts,
    selectedProfiles,
    prefilledProfiles,
    taskSources,
    workflowConfig,
    agents,
  };
};

const getWorkflowConfigArtifact = () => {
  const artifact = managedArtifacts.find((candidate) => candidate.metadata.artifactType === ManagedArtifactType.ProjectWorkflowConfig);

  if (artifact === undefined) {
    throw new Error('Missing Lotus workflow config artifact.');
  }

  return artifact;
};

const resolvePrefilledProfiles = async (root: string | null, state: LotusState): Promise<LotusProfile[]> => {
  if (root !== null) {
    const workflowProfiles = await readWorkflowConfigProfiles(root);

    if (workflowProfiles !== null) {
      return workflowProfiles;
    }
  }

  const profiles = new Set<LotusProfile>();

  for (const managedPath of state.managedPaths) {
    const artifact = getManagedArtifact(managedPath);

    for (const profile of artifact?.metadata.selectedProfiles ?? []) {
      profiles.add(profile);
    }
  }

  return profiles.size > 0 ? [...profiles] : [LotusProfile.LocalFirst];
};

const readWorkflowConfigProfiles = async (root: string): Promise<LotusProfile[] | null> => {
  try {
    const content = await readFile(join(root, '.local', 'workflow.lotus.json'), 'utf8');
    const workflowConfig = workflowConfigSchema.safeParse(JSON.parse(content) as unknown);

    return workflowConfig.success ? workflowConfig.data.selectedProfiles : null;
  } catch {
    return null;
  }
};

const resolveDocsMode = async (root: string | null, detectedDocsArtifacts: string[]): Promise<DocsMode> => {
  if (detectedDocsArtifacts.length > 0) {
    return DocsMode.Committed;
  }

  if (root === null) {
    return DocsMode.LocalOnly;
  }

  const trackedFiles = await execa('git', ['ls-files'], {
    cwd: root,
    reject: true,
  }).catch(() => null);

  if (trackedFiles === null) {
    return DocsMode.LocalOnly;
  }

  return trackedFiles.stdout.trim().length === 0 ? DocsMode.Committed : DocsMode.LocalOnly;
};
