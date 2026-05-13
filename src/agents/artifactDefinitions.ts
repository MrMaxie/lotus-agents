import type { LotusAgent } from '../manifest';
import { agentAdapters, type LotusAgentAdapter } from './adapters';
import type { AgentArtifactDefinition, AgentArtifactSelection } from './artifactTypes';

const createAgentArtifactDefinitions = (adapters: readonly LotusAgentAdapter[]) => {
  const definitions = new Map<string, AgentArtifactDefinition>();

  for (const adapter of adapters) {
    const artifact = adapter.hooks.artifact({ agent: adapter.agent });
    const key = `${artifact.kind}:${artifact.path}`;
    const existingDefinition = definitions.get(key);

    if (existingDefinition !== undefined) {
      existingDefinition.agents.push(adapter.agent);
      continue;
    }

    definitions.set(key, {
      ...artifact,
      agents: [adapter.agent],
    });
  }

  return [...definitions.values()];
};

export const agentArtifactDefinitions = createAgentArtifactDefinitions(agentAdapters);

export const selectAgentArtifacts = (selectedAgents: LotusAgent[]): AgentArtifactSelection[] =>
  agentArtifactDefinitions.flatMap((definition) => {
    const artifactAgents = definition.agents.filter((agent) => selectedAgents.includes(agent));

    return artifactAgents.length > 0
      ? [
          {
            ...definition,
            selectedAgents: artifactAgents,
          },
        ]
      : [];
  });
