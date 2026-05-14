import { z } from 'zod';
import { enumValues } from './enumValues';
import { type LotusProfile, lotusArtifactMetadataSchema, lotusProfileSchema } from './manifest';

export const lotusWorkflowConfigSchemaVersion = 1;

export enum TaskSource {
  LocalNotes = 'local-notes',
  LocalFollowUps = 'local-follow-ups',
  LocalReviews = 'local-reviews',
  LocalFindings = 'local-findings',
  JiraRovo = 'jira-rovo',
  GitHubIssuesGh = 'github-issues-gh',
  GitHubIssuesConnector = 'github-issues-connector',
  LinearIssuesConnector = 'linear-issues-connector',
  GitHubPrCommentsGh = 'github-pr-comments-gh',
  GitHubPrReviewsConnector = 'github-pr-reviews-connector',
  AzurePrReviewsAzDevops = 'azure-pr-reviews-az-devops',
  Figma = 'figma',
}

export enum SourceOfTruthMode {
  Readonly = 'readonly-source-of-truth',
  ReadWrite = 'read-write-source-of-truth',
  Operational = 'operational-source-of-truth',
}

export const taskSourceSchema = z.enum(enumValues(TaskSource));
export const sourceOfTruthModeSchema = z.enum(enumValues(SourceOfTruthMode));

export const localTaskSources = [
  TaskSource.LocalNotes,
  TaskSource.LocalFollowUps,
  TaskSource.LocalReviews,
  TaskSource.LocalFindings,
] as const;

export const remoteTaskSources = [
  TaskSource.JiraRovo,
  TaskSource.GitHubIssuesGh,
  TaskSource.GitHubIssuesConnector,
  TaskSource.LinearIssuesConnector,
  TaskSource.GitHubPrCommentsGh,
  TaskSource.GitHubPrReviewsConnector,
  TaskSource.AzurePrReviewsAzDevops,
  TaskSource.Figma,
] as const;

export const taskSourceLabels: Record<TaskSource, string> = {
  [TaskSource.LocalNotes]: 'Local notes',
  [TaskSource.LocalFollowUps]: 'Local follow-ups',
  [TaskSource.LocalReviews]: 'Local reviews',
  [TaskSource.LocalFindings]: 'Local findings',
  [TaskSource.JiraRovo]: 'Jira through Rovo',
  [TaskSource.GitHubIssuesGh]: 'GitHub issues through gh',
  [TaskSource.GitHubIssuesConnector]: 'GitHub issues through connector',
  [TaskSource.LinearIssuesConnector]: 'Linear issues through connector',
  [TaskSource.GitHubPrCommentsGh]: 'GitHub PR comments through gh',
  [TaskSource.GitHubPrReviewsConnector]: 'GitHub PR reviews through connector',
  [TaskSource.AzurePrReviewsAzDevops]: 'Azure PR reviews through az devops',
  [TaskSource.Figma]: 'Figma or interactive design source',
};

export const sourceOfTruthModeLabels: Record<SourceOfTruthMode, string> = {
  [SourceOfTruthMode.Readonly]: 'Readonly source of truth',
  [SourceOfTruthMode.ReadWrite]: 'Read/write source of truth',
  [SourceOfTruthMode.Operational]: 'Operational source of truth',
};

export const taskSourceSelectionSchema = z
  .object({
    source: taskSourceSchema,
    mode: sourceOfTruthModeSchema,
    writesAllowed: z.boolean(),
    detailsPath: z.string().min(1).optional(),
    priority: z.number().int().positive(),
  })
  .superRefine((selection, context) => {
    if (selection.mode === SourceOfTruthMode.Readonly && selection.writesAllowed) {
      context.addIssue({
        code: 'custom',
        message: 'Readonly task sources cannot allow writes; use read-write-source-of-truth or operational-source-of-truth.',
        path: ['writesAllowed'],
      });
    }
  });

export const workflowConfigSchema = z
  .object({
    metadata: lotusArtifactMetadataSchema,
    lotus: z.literal('project-workflow-config'),
    schemaVersion: z.literal(lotusWorkflowConfigSchemaVersion),
    selectedProfiles: z.array(lotusProfileSchema),
    taskSources: z.array(taskSourceSelectionSchema),
    sourcePriority: z.array(taskSourceSchema),
    conventions: z.object({
      pullRequests: z.object({
        titleFormat: z.string().min(1),
        descriptionSource: z.string().min(1),
        assignmentPolicy: z.string().min(1),
      }),
      commits: z.object({
        allowedPrefixes: z.array(z.enum(['fix', 'chore', 'feat'])).min(1),
        language: z.literal('English'),
        scopes: z.literal('disallowed'),
      }),
      implementation: z.object({
        style: z.string().min(1),
        verbosity: z.string().min(1),
      }),
    }),
    hygiene: z.object({
      procedure: z.literal('workflow-hygiene'),
      afterWork: z.array(z.string().min(1)),
      manualRemoteUpdates: z.array(z.string().min(1)),
    }),
    privateLocalFiles: z.object({
      workflowNotes: z.literal('.local/WORKFLOW.md'),
      credentials: z.literal('.local/CREDENTIALS.md'),
      reproductionNotes: z.literal('.local/issues-notes/'),
      screenshots: z.literal('.local/screenshots/'),
      logs: z.literal('.local/logs/'),
    }),
    overwritePolicy: z.object({
      privatePaths: z.literal('never overwrite non-Lotus private files'),
      managedPaths: z.literal('preserve user-editable content unless forced reinstall is explicit'),
    }),
  })
  .superRefine((config, context) => {
    const taskSources = new Set<TaskSource>();
    const prioritySources = new Set<TaskSource>();

    for (const [index, selection] of config.taskSources.entries()) {
      if (taskSources.has(selection.source)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate task source: ${selection.source}`,
          path: ['taskSources', index, 'source'],
        });
      }

      taskSources.add(selection.source);
    }

    for (const [index, source] of config.sourcePriority.entries()) {
      if (prioritySources.has(source)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate source priority entry: ${source}`,
          path: ['sourcePriority', index],
        });
      }

      prioritySources.add(source);
    }

    if (config.sourcePriority.length !== config.taskSources.length) {
      context.addIssue({
        code: 'custom',
        message: 'sourcePriority must contain exactly one entry for each task source.',
        path: ['sourcePriority'],
      });
    }

    for (const source of config.sourcePriority) {
      if (!taskSources.has(source)) {
        context.addIssue({
          code: 'custom',
          message: `sourcePriority references an unconfigured task source: ${source}`,
          path: ['sourcePriority'],
        });
      }
    }
  });

export type TaskSourceSelection = z.infer<typeof taskSourceSelectionSchema>;
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;

export const normalizeTaskSources = (
  remoteSources: TaskSource[] | undefined,
  modes: Partial<Record<TaskSource, SourceOfTruthMode>> | undefined,
  writeEnabledSources: TaskSource[] | undefined,
): TaskSourceSelection[] => {
  const uniqueRemoteSources = [...new Set(remoteSources ?? [])]
    .map((source) => taskSourceSchema.parse(source))
    .filter((source) => remoteTaskSources.includes(source as (typeof remoteTaskSources)[number]));
  const writableSources = new Set((writeEnabledSources ?? []).map((source) => taskSourceSchema.parse(source)));
  const sources = [...localTaskSources, ...uniqueRemoteSources];

  return sources.map((source, index) => {
    const isRemote = remoteTaskSources.includes(source as (typeof remoteTaskSources)[number]);
    const defaultRemoteMode = writableSources.has(source) ? SourceOfTruthMode.ReadWrite : SourceOfTruthMode.Readonly;
    const mode = modes?.[source] ?? (isRemote ? defaultRemoteMode : SourceOfTruthMode.Operational);
    const writesAllowed = !isRemote || mode !== SourceOfTruthMode.Readonly;

    return {
      source,
      mode: sourceOfTruthModeSchema.parse(mode),
      writesAllowed,
      detailsPath: isRemote ? '.local/WORKFLOW.md' : undefined,
      priority: index + 1,
    };
  });
};

export const createWorkflowConfig = (input: {
  metadata: z.infer<typeof lotusArtifactMetadataSchema>;
  selectedProfiles: LotusProfile[];
  taskSources: TaskSourceSelection[];
}): WorkflowConfig =>
  workflowConfigSchema.parse({
    metadata: input.metadata,
    lotus: 'project-workflow-config',
    schemaVersion: lotusWorkflowConfigSchemaVersion,
    selectedProfiles: input.selectedProfiles,
    taskSources: input.taskSources,
    sourcePriority: input.taskSources.map((source) => source.source),
    conventions: {
      pullRequests: {
        titleFormat: '<TASKID>: <short Linear-aligned description>',
        descriptionSource: '.github/PULL_REQUEST_TEMPLATE.md when GitHub PRs are used',
        assignmentPolicy: 'Leave Linear and GitHub items unassigned unless the human explicitly asks or manual review is required.',
      },
      commits: {
        allowedPrefixes: ['fix', 'chore', 'feat'],
        language: 'English',
        scopes: 'disallowed',
      },
      implementation: {
        style: 'Implement the requested change well and appropriately, with concise artifacts and no filler.',
        verbosity: 'Keep generated docs and notes short, specific, and useful to the next agent or human reader.',
      },
    },
    hygiene: {
      procedure: 'workflow-hygiene',
      afterWork: [
        'Record material progress where the selected operational source expects it.',
        'Keep private reproduction data under .local and out of public package output.',
        'Remove scratch files, logs, traces, and tool sessions that are not part of the requested change.',
      ],
      manualRemoteUpdates: [
        'Update remote sources manually when the configured mode is readonly.',
        'Ask the human before writing to any source that is not explicitly read/write or operational.',
      ],
    },
    privateLocalFiles: {
      workflowNotes: '.local/WORKFLOW.md',
      credentials: '.local/CREDENTIALS.md',
      reproductionNotes: '.local/issues-notes/',
      screenshots: '.local/screenshots/',
      logs: '.local/logs/',
    },
    overwritePolicy: {
      privatePaths: 'never overwrite non-Lotus private files',
      managedPaths: 'preserve user-editable content unless forced reinstall is explicit',
    },
  });

export const renderWorkflowConfig = (config: WorkflowConfig): string => `${JSON.stringify(config, null, 2)}\n`;

export const formatTaskSourceSelection = (selection: TaskSourceSelection): string =>
  `${selection.source} (${selection.mode}${selection.writesAllowed ? ', writes allowed' : ', readonly'})`;
