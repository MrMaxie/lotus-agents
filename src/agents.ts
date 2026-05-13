import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { cancel, isCancel, multiselect, select } from '@clack/prompts';
import matter from 'gray-matter';
import { z } from 'zod';
import { type AgentArtifactKind, agentAdapters, agentArtifactKindSchema, type LotusAgentAdapter } from './agentAdapters';
import { enumValues } from './enumValues';
import { type LotusAgent, lotusAgentSchema, lotusArtifactContentVersion } from './manifest';
import type { CommandContext } from './types';

export { AgentArtifactKind, agentArtifactKindSchema, createAgentAdapter } from './agentAdapters';

export enum AgentSelectionMode {
  Custom = 'custom',
  Recommended = 'recommended',
  None = 'none',
}

export const agentSelectionModeSchema = z.enum(enumValues(AgentSelectionMode));

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

type AgentArtifactMetadata = {
  lotus: 'managed-agent-artifact';
  schemaVersion: number;
  contentVersion: string;
  artifactKind: AgentArtifactKind;
  selectedAgents: LotusAgent[];
  sharedSemantics: string[];
};

const sharedSemantics = ['.local/AGENTS.md', '.docs/AGENTS.md'];
const agentArtifactMetadataSchema = z.object({
  lotus: z.literal('managed-agent-artifact'),
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  artifactKind: agentArtifactKindSchema,
  selectedAgents: z.array(lotusAgentSchema),
  sharedSemantics: z.array(z.string().min(1)),
});

export const supportedAgents = agentAdapters.map((adapter) => adapter.agent);

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

export const createAgentConfiguration = async (root: string, context: CommandContext) => {
  const detections = await detectAgents(root);
  const selectedAgents = await resolveSelectedAgents(detections, context);

  return {
    detections,
    selectedAgents,
    selectedArtifacts: selectAgentArtifacts(selectedAgents),
  };
};

export const detectAgents = async (root: string) =>
  Promise.all(
    agentAdapters.map(async (adapter) => {
      const detectionChecks = adapter.hooks.detect({ agent: adapter.agent });
      const checks = await Promise.all(
        detectionChecks.map(async (check) => ({
          reason: check.reason,
          exists: await pathExists(join(root, check.path)),
        })),
      );

      return {
        agent: adapter.agent,
        reasons: checks.filter((check) => check.exists).map((check) => check.reason),
        detected: checks.some((check) => check.exists),
      };
    }),
  );

export const writeSelectedAgentArtifacts = async (root: string, selectedArtifacts: AgentArtifactSelection[]) => {
  const appliedChanges: string[] = [];

  for (const artifact of selectedArtifacts) {
    const targetPath = join(root, artifact.path);
    const existingMetadata = await readAgentArtifactMetadata(targetPath);

    if (existingMetadata.status === AgentMetadataReadStatus.Unmanaged) {
      appliedChanges.push(`Skipped ${artifact.path}; an existing non-Lotus file is present.`);
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, renderAgentArtifact(artifact));
    appliedChanges.push(`Generated ${artifact.path} for ${formatAgents(artifact.selectedAgents)}.`);
  }

  return appliedChanges;
};

export const removeAgentArtifacts = async (root: string, selectedAgents: LotusAgent[] | undefined) => {
  const appliedChanges: string[] = [];

  for (const definition of agentArtifactDefinitions) {
    const targetPath = join(root, definition.path);
    const metadata = await readAgentArtifactMetadata(targetPath);

    if (metadata.status !== AgentMetadataReadStatus.Managed) {
      continue;
    }

    const agentsToRemove = selectedAgents ?? metadata.metadata.selectedAgents;
    const remainingAgents = metadata.metadata.selectedAgents.filter((agent) => !agentsToRemove.includes(agent));

    if (remainingAgents.length === 0) {
      await rm(targetPath, { force: true });
      appliedChanges.push(`Removed ${definition.path}.`);
      continue;
    }

    await writeFile(
      targetPath,
      renderAgentArtifact({
        ...definition,
        selectedAgents: remainingAgents,
      }),
    );
    appliedChanges.push(`Updated ${definition.path}; retained ${formatAgents(remainingAgents)}.`);
  }

  return appliedChanges;
};

export const formatDetectedAgents = (detections: AgentDetection[]) => {
  const detected = detections.filter((detection) => detection.detected);

  return detected.length > 0 ? detected.map((detection) => `${detection.agent} (${detection.reasons.join(', ')})`).join(', ') : 'none';
};

export const formatAgents = (agents: LotusAgent[]) => (agents.length > 0 ? agents.join(', ') : 'none');

const selectAgentArtifacts = (selectedAgents: LotusAgent[]) =>
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

const resolveSelectedAgents = async (detections: AgentDetection[], context: CommandContext) => {
  if (context.noAgentArtifacts === true) {
    return [];
  }

  if (context.selectRecommendedAgents === true) {
    return detections.filter((detection) => detection.detected).map((detection) => detection.agent);
  }

  if (context.selectedAgents !== undefined) {
    return z.array(lotusAgentSchema).parse([...new Set(context.selectedAgents)]);
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive) {
    return [];
  }

  const mode = await select<AgentSelectionMode>({
    message: 'Choose agent artifact selection.',
    options: [
      { value: AgentSelectionMode.Recommended, label: 'Select recommended', hint: 'Use all detected agents.' },
      { value: AgentSelectionMode.Custom, label: 'Select manually', hint: 'Choose one or more supported agents.' },
      { value: AgentSelectionMode.None, label: 'No agent artifacts', hint: 'Do not generate agent entrypoint files.' },
    ],
  });

  if (isCancel(mode)) {
    cancel('Canceled.');
    return [];
  }

  const parsedMode = agentSelectionModeSchema.parse(mode);

  if (parsedMode === AgentSelectionMode.None) {
    return [];
  }

  if (parsedMode === AgentSelectionMode.Recommended) {
    return detections.filter((detection) => detection.detected).map((detection) => detection.agent);
  }

  const agents = await multiselect<LotusAgent>({
    message: 'Choose agent artifacts to generate.',
    options: supportedAgents.map((agent) => ({ value: agent, label: agent })),
    required: false,
  });

  if (isCancel(agents)) {
    cancel('Canceled.');
    return [];
  }

  return z.array(lotusAgentSchema).parse(agents);
};

const renderAgentArtifact = (artifact: AgentArtifactSelection) => {
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

const renderSharedSemanticsBody = () =>
  [
    'Use shared Lotus semantics instead of duplicating project workflow rules in this file.',
    '',
    'Read order:',
    '1. Explicit human instruction in the current session.',
    '2. `.local/AGENTS.md` when present for private project and workflow state.',
    '3. `.docs/AGENTS.md` when present for durable project guidance.',
    '4. Relevant files under `.docs/spec/`, `.docs/practices/`, and `.docs/templates/` when those folders exist.',
    '',
    'Keep agent-specific behavior limited to this entrypoint. The durable Lotus rules live in the shared files above.',
  ].join('\n');

enum AgentMetadataReadStatus {
  Missing = 'missing',
  Managed = 'managed',
  Unmanaged = 'unmanaged',
}

type AgentMetadataReadResult =
  | { status: AgentMetadataReadStatus.Missing }
  | { status: AgentMetadataReadStatus.Managed; metadata: AgentArtifactMetadata }
  | { status: AgentMetadataReadStatus.Unmanaged };

const readAgentArtifactMetadata = async (path: string): Promise<AgentMetadataReadResult> => {
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

const pathExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};
