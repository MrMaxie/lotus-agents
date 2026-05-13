import { LotusAgent } from '../../manifest';
import { AgentArtifactKind, createAgentAdapter } from './createAgentAdapter';

export const claudeAgentAdapter = createAgentAdapter({
  agent: LotusAgent.Claude,
  hooks: {
    detect: () => [
      { path: 'CLAUDE.md', reason: 'repository CLAUDE.md' },
      { path: '.claude', reason: 'repository .claude configuration' },
    ],
    artifact: () => ({
      path: 'CLAUDE.md',
      kind: AgentArtifactKind.ClaudeMemory,
      title: 'Lotus Agent Entry Point',
    }),
  },
});
