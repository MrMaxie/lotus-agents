import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { cancel, isCancel, multiselect, select } from '@clack/prompts';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { enumValues } from './enumValues';
import { LotusAgent, lotusAgentSchema, lotusArtifactContentVersion } from './manifest';
import type { CommandContext } from './types';

export enum AgentSelectionMode {
  Custom = 'custom',
  Recommended = 'recommended',
  None = 'none',
}

export enum AgentArtifactKind {
  SharedAgents = 'shared-agents',
  ClaudeMemory = 'claude-memory',
  CursorRule = 'cursor-rule',
}

export const agentSelectionModeSchema = z.enum(enumValues(AgentSelectionMode));
export const agentArtifactKindSchema = z.enum(enumValues(AgentArtifactKind));

export type AgentDetection = {
  agent: LotusAgent;
  detected: boolean;
  reasons: string[];
};

export type AgentArtifactDefinition = {
  path: string;
  kind: AgentArtifactKind;
  agents: LotusAgent[];
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

const agentArtifactMetadataSchema = z.object({
  lotus: z.literal('managed-agent-artifact'),
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  artifactKind: agentArtifactKindSchema,
  selectedAgents: z.array(lotusAgentSchema),
  sharedSemantics: z.array(z.string().min(1)),
});

export const supportedAgents = [LotusAgent.Codex, LotusAgent.Opencode, LotusAgent.Claude, LotusAgent.Cursor] as const;

export const agentArtifactDefinitions: AgentArtifactDefinition[] = [
  {
    path: 'AGENTS.md',
    kind: AgentArtifactKind.SharedAgents,
    agents: [LotusAgent.Codex, LotusAgent.Opencode],
  },
  {
    path: 'CLAUDE.md',
    kind: AgentArtifactKind.ClaudeMemory,
    agents: [LotusAgent.Claude],
  },
  {
    path: '.cursor/rules/lotus.mdc',
    kind: AgentArtifactKind.CursorRule,
    agents: [LotusAgent.Cursor],
  },
];

export async function createAgentConfiguration(root: string, context: CommandContext): Promise<AgentConfiguration> {
  const detections = await detectAgents(root);
  const selectedAgents = await resolveSelectedAgents(detections, context);

  return {
    detections,
    selectedAgents,
    selectedArtifacts: selectAgentArtifacts(selectedAgents),
  };
}

export async function detectAgents(root: string): Promise<AgentDetection[]> {
  const detectionInputs = await Promise.all([
    createDetection(LotusAgent.Codex, [
      ['AGENTS.md', 'repository AGENTS.md'],
      ['.codex', 'repository .codex configuration'],
    ]),
    createDetection(LotusAgent.Opencode, [
      ['AGENTS.md', 'repository AGENTS.md'],
      ['opencode.json', 'repository opencode.json'],
      ['.opencode', 'repository .opencode configuration'],
    ]),
    createDetection(LotusAgent.Claude, [
      ['CLAUDE.md', 'repository CLAUDE.md'],
      ['.claude', 'repository .claude configuration'],
    ]),
    createDetection(LotusAgent.Cursor, [
      ['.cursor', 'repository .cursor configuration'],
      ['.cursorrules', 'legacy repository .cursorrules'],
    ]),
  ]);

  return detectionInputs.map(({ agent, checks }) => ({
    agent,
    reasons: checks.filter((check) => check.exists).map((check) => check.reason),
    detected: checks.some((check) => check.exists),
  }));

  async function createDetection(
    agent: LotusAgent,
    checks: [path: string, reason: string][],
  ): Promise<{ agent: LotusAgent; checks: { reason: string; exists: boolean }[] }> {
    return {
      agent,
      checks: await Promise.all(
        checks.map(async ([path, reason]) => ({
          reason,
          exists: await pathExists(join(root, path)),
        })),
      ),
    };
  }
}

export async function writeSelectedAgentArtifacts(root: string, selectedArtifacts: AgentArtifactSelection[]): Promise<string[]> {
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
}

export async function removeAgentArtifacts(root: string, selectedAgents: LotusAgent[] | undefined): Promise<string[]> {
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

    const selectedArtifact = {
      ...definition,
      selectedAgents: remainingAgents,
    };

    await writeFile(targetPath, renderAgentArtifact(selectedArtifact));
    appliedChanges.push(`Updated ${definition.path}; retained ${formatAgents(remainingAgents)}.`);
  }

  return appliedChanges;
}

export function formatDetectedAgents(detections: AgentDetection[]): string {
  const detected = detections.filter((detection) => detection.detected);

  if (detected.length === 0) {
    return 'none';
  }

  return detected.map((detection) => `${detection.agent} (${detection.reasons.join(', ')})`).join(', ');
}

export function formatAgents(agents: LotusAgent[]): string {
  return agents.length > 0 ? agents.join(', ') : 'none';
}

function selectAgentArtifacts(selectedAgents: LotusAgent[]): AgentArtifactSelection[] {
  return agentArtifactDefinitions.flatMap((definition) => {
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
}

async function resolveSelectedAgents(detections: AgentDetection[], context: CommandContext): Promise<LotusAgent[]> {
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
}

function renderAgentArtifact(artifact: AgentArtifactSelection): string {
  const metadata: AgentArtifactMetadata = {
    lotus: 'managed-agent-artifact',
    schemaVersion: 1,
    contentVersion: lotusArtifactContentVersion,
    artifactKind: artifact.kind,
    selectedAgents: artifact.selectedAgents,
    sharedSemantics: ['.local/AGENTS.md', '.docs/AGENTS.md'],
  };

  const frontmatter = renderYamlMetadata(
    metadata,
    artifact.kind === AgentArtifactKind.CursorRule ? ['description: Lotus shared workflow semantics', 'alwaysApply: true'] : [],
  );

  if (artifact.kind === AgentArtifactKind.CursorRule) {
    return `${frontmatter}\n# Lotus Shared Workflow\n\n${renderSharedSemanticsBody()}\n`;
  }

  return `${frontmatter}\n# Lotus Agent Entry Point\n\n${renderSharedSemanticsBody()}\n`;
}

function renderSharedSemanticsBody(): string {
  return [
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
}

function renderYamlMetadata(metadata: AgentArtifactMetadata, extraLines: string[]): string {
  return [
    '---',
    'lotus: managed-agent-artifact',
    'schemaVersion: 1',
    `contentVersion: "${metadata.contentVersion}"`,
    `artifactKind: ${metadata.artifactKind}`,
    ...extraLines,
    'selectedAgents:',
    ...metadata.selectedAgents.map((agent) => `  - ${agent}`),
    'sharedSemantics:',
    ...metadata.sharedSemantics.map((path) => `  - ${path}`),
    '---',
  ].join('\n');
}

enum AgentMetadataReadStatus {
  Missing = 'missing',
  Managed = 'managed',
  Unmanaged = 'unmanaged',
}

type AgentMetadataReadResult =
  | { status: AgentMetadataReadStatus.Missing }
  | { status: AgentMetadataReadStatus.Managed; metadata: AgentArtifactMetadata }
  | { status: AgentMetadataReadStatus.Unmanaged };

async function readAgentArtifactMetadata(path: string): Promise<AgentMetadataReadResult> {
  try {
    const content = await readFile(path, 'utf8');
    const frontmatter = extractFrontmatter(content);

    if (frontmatter === null) {
      return { status: AgentMetadataReadStatus.Unmanaged };
    }

    const parsed = agentArtifactMetadataSchema.safeParse(parseYaml(frontmatter));

    return parsed.success
      ? { status: AgentMetadataReadStatus.Managed, metadata: parsed.data }
      : { status: AgentMetadataReadStatus.Unmanaged };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { status: AgentMetadataReadStatus.Missing };
    }

    throw error;
  }
}

function extractFrontmatter(content: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);

  return match?.[1] ?? null;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
