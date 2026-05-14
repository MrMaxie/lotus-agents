import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { lotusAgentSchema, lotusArtifactContentVersion } from '../manifest';
import {
  type AgentArtifactMetadata,
  type AgentArtifactSelection,
  type AgentMetadataReadResult,
  AgentMetadataReadStatus,
  createAgentArtifactMetadataSchema,
  sharedSemantics,
} from './artifactTypes';

const agentArtifactMetadataSchema = createAgentArtifactMetadataSchema(lotusAgentSchema);

export const renderAgentArtifact = (artifact: AgentArtifactSelection) => {
  const metadata = {
    lotus: 'managed-agent-artifact',
    schemaVersion: 1,
    contentVersion: lotusArtifactContentVersion,
    artifactKind: artifact.kind,
    ...artifact.extraFrontmatter,
    selectedAgents: artifact.selectedAgents,
    sharedSemantics,
  } satisfies AgentArtifactMetadata & Record<string, unknown>;

  return matter.stringify(`# ${artifact.title}\n\n${renderSharedSemanticsBody()}\n`, metadata);
};

export const readAgentArtifactMetadata = async (path: string): Promise<AgentMetadataReadResult> => {
  try {
    const parsed = matter(await readFile(path, 'utf8'));
    const metadata = agentArtifactMetadataSchema.safeParse(parsed.data);

    return metadata.success
      ? {
          status: AgentMetadataReadStatus.Managed,
          metadata: metadata.data,
        }
      : { status: AgentMetadataReadStatus.Unmanaged };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { status: AgentMetadataReadStatus.Missing };
    }

    throw error;
  }
};

const renderSharedSemanticsBody = () =>
  [
    'Use shared Lotus semantics instead of duplicating project workflow rules in this file.',
    '',
    'Read order:',
    '1. Explicit human instruction in the current session.',
    '2. `.local/AGENTS.md` when present for private project and workflow state.',
    '3. `.local/workflow.lotus.json` and `.local/WORKFLOW.md` when present for selected profiles, source priority, tool preferences, and private local access notes.',
    '4. `.docs/AGENTS.md` when present for durable project guidance.',
    '5. Relevant files under `.docs/spec/`, `.docs/practices/`, and `.docs/templates/` when those folders exist.',
    '',
    'Keep agent-specific behavior limited to this entrypoint. The durable Lotus rules live in the shared files above.',
  ].join('\n');
