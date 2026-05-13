import { LotusAgent } from '../manifest';
import { AgentArtifactKind, createAgentAdapter } from './createAgentAdapter';

export const cursorAgentAdapter = createAgentAdapter({
  agent: LotusAgent.Cursor,
  hooks: {
    detect: () => [
      { path: '.cursor', reason: 'repository .cursor configuration' },
      { path: '.cursorrules', reason: 'legacy repository .cursorrules' },
    ],
    artifact: () => ({
      path: '.cursor/rules/lotus.mdc',
      kind: AgentArtifactKind.CursorRule,
      title: 'Lotus Shared Workflow',
      extraFrontmatter: {
        description: 'Lotus shared workflow semantics',
        alwaysApply: true,
      },
    }),
  },
});
