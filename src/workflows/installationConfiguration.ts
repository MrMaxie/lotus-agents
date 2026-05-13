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
    docsMode: detectedDocsArtifacts.length > 0 ? DocsMode.Committed : DocsMode.LocalOnly,
    detectedDocsArtifacts,
    agents,
  };
};
