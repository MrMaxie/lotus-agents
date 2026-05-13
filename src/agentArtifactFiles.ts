import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { readAgentArtifactMetadata, renderAgentArtifact } from './agentArtifactContent';
import { agentArtifactDefinitions } from './agentArtifactDefinitions';
import { type AgentArtifactSelection, AgentMetadataReadStatus } from './agentArtifactTypes';
import { formatAgents } from './agentFormatting';
import type { LotusAgent } from './manifest';

export const writeSelectedAgentArtifacts = async (root: string, selectedArtifacts: AgentArtifactSelection[]) => {
  const appliedChanges: string[] = [];

  for (const artifact of selectedArtifacts) {
    const targetPath = join(root, artifact.path);
    const existingMetadata = await readAgentArtifactMetadata(targetPath);

    if (existingMetadata.status === AgentMetadataReadStatus.Unmanaged) {
      appliedChanges.push(`Skipped ${artifact.path}; an existing non-Lotus file is present.`);
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, renderAgentArtifact(artifact));
    appliedChanges.push(`Generated ${artifact.path} for ${formatAgents(artifact.selectedAgents)}.`);
  }

  return appliedChanges;
};

export const removeAgentArtifacts = async (root: string, selectedAgents: LotusAgent[] | undefined) => {
  const appliedChanges: string[] = [];

  for (const definition of agentArtifactDefinitions) {
    const targetPath = join(root, definition.path);
    const metadata = await readAgentArtifactMetadata(targetPath);

    if (metadata.status !== AgentMetadataReadStatus.Managed) {
      continue;
    }

    const agentsToRemove = selectedAgents ?? metadata.metadata.selectedAgents;
    const remainingAgents = metadata.metadata.selectedAgents.filter((agent) => !agentsToRemove.includes(agent));

    if (remainingAgents.length === 0) {
      await rm(targetPath, { force: true });
      appliedChanges.push(`Removed ${definition.path}.`);
      continue;
    }

    await writeFile(
      targetPath,
      renderAgentArtifact({
        ...definition,
        selectedAgents: remainingAgents,
      }),
    );
    appliedChanges.push(`Updated ${definition.path}; retained ${formatAgents(remainingAgents)}.`);
  }

  return appliedChanges;
};
