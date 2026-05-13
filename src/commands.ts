import pc from 'picocolors';
import { type ProjectCommand, projectCommandSchema } from './projectCommands';
import { detectRepository } from './repository';
import { detectLotusState } from './state';
import type { CliResult, CommandContext } from './types';
import { applyWorkflowPlan } from './workflows/workflowExecution';
import { createWorkflowPlan } from './workflows/workflowPlanning';
import { renderPlanSummary, renderResultSummary } from './workflows/workflowRendering';
import { WorkflowMode } from './workflows/workflowTypes';

export { DocsMode, docsModeSchema, ProjectCommand, projectCommandSchema } from './projectCommands';

export async function runProjectCommand(command: ProjectCommand, context: CommandContext): Promise<CliResult> {
  const parsedCommand = projectCommandSchema.parse(command);
  const repository = await detectRepository(context.cwd);

  if (!repository.isRepository) {
    context.stderr(
      [
        pc.red(`Cannot run '${parsedCommand}' outside a Git repository.`),
        'Run this command from a project repository, or use --help/--version for global CLI information.',
      ].join('\n'),
    );

    return { exitCode: 1 };
  }

  const state = await detectLotusState(repository);
  const plan = await createWorkflowPlan(parsedCommand, repository, state, context);

  renderPlanSummary(plan, context);

  if (plan.mode === WorkflowMode.Cancel) {
    context.stdout(`${pc.yellow('Result:')} ${plan.resultMessage}\n`);
    return { exitCode: 0 };
  }

  const appliedChanges = await applyWorkflowPlan(plan);
  renderResultSummary(plan, appliedChanges, context);

  return { exitCode: 0 };
}
