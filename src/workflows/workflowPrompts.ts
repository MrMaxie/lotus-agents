import { cancel, isCancel, select } from '@clack/prompts';
import type { LotusState } from '../state';
import { type CommandContext, RemoveScope, removeScopeSchema, WorkflowAction, workflowActionSchema } from '../types';

export async function resolveUpdateAction(context: CommandContext): Promise<WorkflowAction> {
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
}

export async function resolveRemoveScope(context: CommandContext, state: LotusState): Promise<RemoveScope | WorkflowAction.Cancel> {
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
}
