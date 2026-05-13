import { LotusAgent } from '../manifest';
import { AgentArtifactKind, createAgentAdapter } from './createAgentAdapter';

export const opencodeAgentAdapter = createAgentAdapter({
  agent: LotusAgent.Opencode,
  hooks: {
    detect: () => [
      { path: 'AGENTS.md', reason: 'repository AGENTS.md' },
      { path: 'opencode.json', reason: 'repository opencode.json' },
      { path: '.opencode', reason: 'repository .opencode configuration' },
    ],
    artifact: () => ({
      path: 'AGENTS.md',
      kind: AgentArtifactKind.SharedAgents,
      title: 'Lotus Agent Entry Point',
    }),
  },
});
