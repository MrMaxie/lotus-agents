import { execa } from 'execa';
import { createAgentConfiguration } from '../agents';
import { getManagedArtifact, ManagedArtifactScope } from '../manifest';
import { DocsMode } from '../projectCommands';
import type { LotusState } from '../state';
import type { CommandContext, RepositoryState } from '../types';
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

  return {
    docsMode: await resolveDocsMode(repository.root, detectedDocsArtifacts),
    detectedDocsArtifacts,
    agents,
  };
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
