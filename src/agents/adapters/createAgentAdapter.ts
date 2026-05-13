import { z } from 'zod';
import { enumValues } from '../../enumValues';
import type { LotusAgent } from '../../manifest';

export enum AgentArtifactKind {
  SharedAgents = 'shared-agents',
  ClaudeMemory = 'claude-memory',
  CursorRule = 'cursor-rule',
}

export const agentArtifactKindSchema = z.enum(enumValues(AgentArtifactKind));

export type AgentDetectionCheck = {
  path: string;
  reason: string;
};

export type AgentArtifactAdapter = {
  path: string;
  kind: AgentArtifactKind;
  title: string;
  extraFrontmatter?: Record<string, unknown>;
};

export type AgentDetectionHookContext<TAgent extends LotusAgent = LotusAgent> = {
  agent: TAgent;
};

export type AgentArtifactHookContext<TAgent extends LotusAgent = LotusAgent> = {
  agent: TAgent;
};

export type AgentAdapterHooks = {
  detect: (context: AgentDetectionHookContext) => AgentDetectionCheck[];
  artifact: (context: AgentArtifactHookContext) => AgentArtifactAdapter;
};

export type LotusAgentAdapter = {
  agent: LotusAgent;
  hooks: AgentAdapterHooks;
};

export const createAgentAdapter = <const TAgent extends LotusAgent>(adapter: {
  agent: TAgent;
  hooks: {
    detect: (context: AgentDetectionHookContext<TAgent>) => AgentDetectionCheck[];
    artifact: (context: AgentArtifactHookContext<TAgent>) => AgentArtifactAdapter;
  };
}): LotusAgentAdapter => ({
  agent: adapter.agent,
  hooks: {
    detect: () => adapter.hooks.detect({ agent: adapter.agent }),
    artifact: () => adapter.hooks.artifact({ agent: adapter.agent }),
  },
});
