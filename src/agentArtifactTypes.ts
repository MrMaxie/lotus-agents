import { z } from 'zod';
import { type AgentArtifactKind, agentArtifactKindSchema } from './agentAdapters';
import type { LotusAgent } from './manifest';

export enum AgentMetadataReadStatus {
  Missing = 'missing',
  Managed = 'managed',
  Unmanaged = 'unmanaged',
}

export type AgentDetection = {
  agent: LotusAgent;
  detected: boolean;
  reasons: string[];
};

export type AgentArtifactDefinition = {
  path: string;
  kind: AgentArtifactKind;
  title: string;
  agents: LotusAgent[];
  extraFrontmatter?: Record<string, unknown>;
};

export type AgentArtifactSelection = AgentArtifactDefinition & {
  selectedAgents: LotusAgent[];
};

export type AgentConfiguration = {
  detections: AgentDetection[];
  selectedAgents: LotusAgent[];
  selectedArtifacts: AgentArtifactSelection[];
};

export type AgentArtifactMetadata = {
  lotus: 'managed-agent-artifact';
  schemaVersion: number;
  contentVersion: string;
  artifactKind: AgentArtifactKind;
  selectedAgents: LotusAgent[];
  sharedSemantics: string[];
};

export type AgentMetadataReadResult =
  | { status: AgentMetadataReadStatus.Missing }
  | { status: AgentMetadataReadStatus.Managed; metadata: AgentArtifactMetadata }
  | { status: AgentMetadataReadStatus.Unmanaged };

export const sharedSemantics = ['.local/AGENTS.md', '.docs/AGENTS.md'];

export const createAgentArtifactMetadataSchema = (lotusAgentSchema: z.ZodType<LotusAgent>) =>
  z.object({
    lotus: z.literal('managed-agent-artifact'),
    schemaVersion: z.literal(1),
    contentVersion: z.string().min(1),
    artifactKind: agentArtifactKindSchema,
    selectedAgents: z.array(lotusAgentSchema),
    sharedSemantics: z.array(z.string().min(1)),
  });
