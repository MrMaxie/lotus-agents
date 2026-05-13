import { LotusAgent } from '../../manifest';
import { AgentArtifactKind, createAgentAdapter } from './createAgentAdapter';

export const codexAgentAdapter = createAgentAdapter({
  agent: LotusAgent.Codex,
  hooks: {
    detect: () => [
      { path: 'AGENTS.md', reason: 'repository AGENTS.md' },
      { path: '.codex', reason: 'repository .codex configuration' },
    ],
    artifact: () => ({
      path: 'AGENTS.md',
      kind: AgentArtifactKind.SharedAgents,
      title: 'Lotus Agent Entry Point',
    }),
  },
});
