import { agentAdapters } from './agentAdapters';
import { selectAgentArtifacts } from './agentArtifactDefinitions';
import { detectAgents } from './agentDetection';
import { resolveSelectedAgents } from './agentSelection';
import type { CommandContext } from './types';

export { AgentArtifactKind, agentArtifactKindSchema, createAgentAdapter } from './agentAdapters';
export { agentArtifactDefinitions } from './agentArtifactDefinitions';
export { removeAgentArtifacts, writeSelectedAgentArtifacts } from './agentArtifactFiles';
export type { AgentArtifactDefinition, AgentArtifactSelection, AgentConfiguration, AgentDetection } from './agentArtifactTypes';
export { detectAgents } from './agentDetection';
export { formatAgents, formatDetectedAgents } from './agentFormatting';
export { AgentSelectionMode, agentSelectionModeSchema } from './agentSelection';

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
