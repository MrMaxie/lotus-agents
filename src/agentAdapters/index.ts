import { claudeAgentAdapter } from './claude';
import { codexAgentAdapter } from './codex';
import { cursorAgentAdapter } from './cursor';
import { opencodeAgentAdapter } from './opencode';

export type {
  AgentAdapterHooks,
  AgentArtifactAdapter,
  AgentArtifactHookContext,
  AgentDetectionCheck,
  AgentDetectionHookContext,
  LotusAgentAdapter,
} from './createAgentAdapter';
export { AgentArtifactKind, agentArtifactKindSchema, createAgentAdapter } from './createAgentAdapter';

export const agentAdapters = [codexAgentAdapter, opencodeAgentAdapter, claudeAgentAdapter, cursorAgentAdapter] as const;
