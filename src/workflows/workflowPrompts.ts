import { cancel, isCancel, multiselect, select } from '@clack/prompts';
import { z } from 'zod';
import { enumValues } from '../enumValues';
import { type LotusProfile, lotusProfileSchema } from '../manifest';
import type { LotusState } from '../state';
import { type CommandContext, RemoveScope, removeScopeSchema, WorkflowAction, workflowActionSchema } from '../types';
import {
  remoteTaskSources,
  type SourceOfTruthMode,
  sourceOfTruthModeLabels,
  sourceOfTruthModeSchema,
  TaskSource,
  taskSourceLabels,
  taskSourceSchema,
} from '../workflowConfig';

export class WorkflowPromptCanceledError extends Error {
  constructor() {
    super('Workflow prompt canceled.');
  }
}

export const isWorkflowPromptCanceledError = (error: unknown): error is WorkflowPromptCanceledError =>
  error instanceof WorkflowPromptCanceledError;

export const resolveSelectedProfiles = async (context: CommandContext, prefilledProfiles: LotusProfile[]): Promise<LotusProfile[]> => {
  if (context.selectedProfiles !== undefined) {
    return z.array(lotusProfileSchema).parse([...new Set(context.selectedProfiles)]);
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive) {
    return prefilledProfiles;
  }

  const profiles = await multiselect<LotusProfile>({
    message: 'Choose Lotus workflow profiles.',
    options: [
      {
        value: 'local-first' as LotusProfile,
        label: 'local-first',
        hint: 'Use .local for operations and .docs for durable project guidance.',
      },
      {
        value: 'linear-first' as LotusProfile,
        label: 'linear-first',
        hint: 'Use Linear as the operational source while keeping private config local.',
      },
    ],
    initialValues: prefilledProfiles,
    required: false,
  });

  if (isCancel(profiles)) {
    cancel('Canceled.');
    throw new WorkflowPromptCanceledError();
  }

  return z.array(lotusProfileSchema).parse(profiles);
};

export const resolveSelectedTaskSources = async (context: CommandContext): Promise<TaskSource[]> => {
  if (context.selectedTaskSources !== undefined) {
    return z.array(taskSourceSchema).parse([...new Set(context.selectedTaskSources)]);
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive) {
    return [];
  }

  const sources = await multiselect<TaskSource>({
    message: 'Choose remote or interactive task sources agents may use.',
    options: remoteTaskSources.map((source) => ({ value: source, label: taskSourceLabels[source] })),
    required: false,
  });

  if (isCancel(sources)) {
    cancel('Canceled.');
    throw new WorkflowPromptCanceledError();
  }

  return z.array(taskSourceSchema).parse(sources);
};

export const resolveTaskSourceModes = async (
  context: CommandContext,
  selectedSources: TaskSource[],
): Promise<Partial<Record<TaskSource, SourceOfTruthMode>>> => {
  const parsedContextModes = taskSourceModeMapSchema.parse(context.taskSourceModes ?? {});
  const isInteractive = context.isInteractive ?? process.stdin.isTTY;
  const modes: Partial<Record<TaskSource, SourceOfTruthMode>> = { ...parsedContextModes };

  if (!isInteractive) {
    return modes;
  }

  for (const source of selectedSources) {
    if (modes[source] !== undefined) {
      continue;
    }

    const mode = await select<SourceOfTruthMode>({
      message: `Choose source-of-truth mode for ${taskSourceLabels[source]}.`,
      options: sourceOfTruthModeSchema.options.map((sourceMode) => ({
        value: sourceMode,
        label: sourceOfTruthModeLabels[sourceMode],
      })),
    });

    if (isCancel(mode)) {
      cancel('Canceled.');
      throw new WorkflowPromptCanceledError();
    }

    modes[source] = sourceOfTruthModeSchema.parse(mode);
  }

  return modes;
};

export const resolveUpdateAction = async (context: CommandContext): Promise<WorkflowAction> => {
  if (context.updateAction !== undefined) {
    return workflowActionSchema.parse(context.updateAction);
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive) {
    return WorkflowAction.Update;
  }

  const action = await select<WorkflowAction>({
    message: 'Existing Lotus state detected. Choose the next action.',
    options: [
      { value: WorkflowAction.Update, label: 'Update', hint: 'Refresh managed Lotus artifacts.' },
      { value: WorkflowAction.Remove, label: 'Remove', hint: 'Delete known Lotus-managed artifacts.' },
      { value: WorkflowAction.Cancel, label: 'Cancel', hint: 'Exit without changing files.' },
    ],
  });

  if (isCancel(action)) {
    cancel('Canceled.');
    return WorkflowAction.Cancel;
  }

  return action;
};

export const resolveRemoveScope = async (context: CommandContext, state: LotusState): Promise<RemoveScope | WorkflowAction.Cancel> => {
  if (context.removeScope !== undefined) {
    return removeScopeSchema.parse(context.removeScope);
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive || !state.hasManagedState) {
    return RemoveScope.All;
  }

  const scope = await select<RemoveScope>({
    message: 'Choose which Lotus-managed artifacts to remove.',
    options: [
      { value: RemoveScope.All, label: 'All', hint: 'Delete all detected Lotus-managed artifacts.' },
      { value: RemoveScope.Local, label: '.local only', hint: 'Delete detected private Lotus artifacts.' },
      { value: RemoveScope.Docs, label: '.docs only', hint: 'Delete detected documentation workflow artifacts.' },
    ],
  });

  if (isCancel(scope)) {
    cancel('Canceled.');
    return WorkflowAction.Cancel;
  }

  return scope;
};

const taskSourceModeMapSchema = z.partialRecord(z.enum(enumValues(TaskSource)), sourceOfTruthModeSchema);
