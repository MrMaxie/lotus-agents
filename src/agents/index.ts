import type { CommandContext } from '../types';
import { agentAdapters } from './adapters';
import { selectAgentArtifacts } from './artifactDefinitions';
import { detectAgents } from './detection';
import { resolveSelectedAgents } from './selection';

export { AgentArtifactKind, agentArtifactKindSchema, createAgentAdapter } from './adapters';
export { agentArtifactDefinitions } from './artifactDefinitions';
export { removeAgentArtifacts, writeSelectedAgentArtifacts } from './artifactFiles';
export type { AgentArtifactDefinition, AgentArtifactSelection, AgentConfiguration, AgentDetection } from './artifactTypes';
export { detectAgents } from './detection';
export { formatAgents, formatDetectedAgents } from './formatting';
export { AgentSelectionMode, agentSelectionModeSchema } from './selection';

export const supportedAgents = agentAdapters.map((adapter) => adapter.agent);

export const createAgentConfiguration = async (root: string, context: CommandContext) => {
  const detections = await detectAgents(root);
  const selectedAgents = await resolveSelectedAgents(detections, supportedAgents, context);

  return {
    detections,
    selectedAgents,
    selectedArtifacts: selectAgentArtifacts(selectedAgents),
  };
};
