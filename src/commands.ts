import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { cancel, isCancel, select } from '@clack/prompts';
import { Listr } from 'listr2';
import pc from 'picocolors';
import { detectRepository } from './repository.js';
import type { CliResult, CommandContext, RepositoryState, WorkflowAction } from './types.js';

type ProjectCommand = 'install' | 'update' | 'remove' | 'doctor' | 'validate';

type WorkflowMode = 'fresh-install' | 'detected-update' | 'explicit-update' | 'remove' | 'cancel' | 'diagnose';

type LotusState = {
  hasManagedState: boolean;
  managedPaths: string[];
  missingManagedPaths: string[];
};

type WorkflowPlan = {
  command: ProjectCommand;
  mode: WorkflowMode;
  title: string;
  plannedChanges: string[];
  resultMessage: string;
  state: LotusState;
  repository: RepositoryState;
};

const managedArtifactPaths = ['.local/AGENTS.md', '.docs/AGENTS.md', '.docs/spec/_toc.md'] as const;

const diagnosticMessages: Record<'doctor' | 'validate', string> = {
  doctor: 'Inspect managed Lotus project state and report repair guidance.',
  validate: 'Validate known Lotus-managed project artifacts.',
};

export async function runProjectCommand(command: ProjectCommand, context: CommandContext): Promise<CliResult> {
  const repository = await detectRepository(context.cwd);

  if (!repository.isRepository) {
    context.stderr(
      [
        pc.red(`Cannot run '${command}' outside a Git repository.`),
        'Run this command from a project repository, or use --help/--version for global CLI information.',
      ].join('\n'),
    );

    return { exitCode: 1 };
  }

  const state = await detectLotusState(repository);
  const plan = await createWorkflowPlan(command, repository, state, context);

  renderPlanSummary(plan, context);

  if (plan.mode === 'cancel') {
    context.stdout(`${pc.yellow('Result:')} ${plan.resultMessage}\n`);
    return { exitCode: 0 };
  }

  const appliedChanges = await applyWorkflowPlan(plan);
  renderResultSummary(plan, appliedChanges, context);

  return { exitCode: 0 };
}

async function createWorkflowPlan(
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
): Promise<WorkflowPlan> {
  if (command === 'install') {
    if (state.hasManagedState) {
      return {
        command,
        mode: 'detected-update',
        title: 'Existing Lotus state detected; running update workflow.',
        plannedChanges: [
          'Inspect existing managed Lotus artifacts.',
          'Reuse detected state as prefilled update input.',
          'Prepare local-only project artifact updates.',
        ],
        resultMessage: 'Update workflow completed.',
        state,
        repository,
      };
    }

    return {
      command,
      mode: 'fresh-install',
      title: 'Fresh install workflow.',
      plannedChanges: [
        'Prepare local Lotus project artifacts in this repository.',
        'Keep project artifacts local even when the CLI is run globally.',
        'Leave private values out of package templates and public docs.',
      ],
      resultMessage: 'Install workflow completed.',
      state,
      repository,
    };
  }

  if (command === 'update') {
    const action = await resolveUpdateAction(context);

    if (action === 'cancel') {
      return {
        command,
        mode: 'cancel',
        title: 'Update canceled before applying changes.',
        plannedChanges: ['No files will be changed.'],
        resultMessage: 'No changes applied.',
        state,
        repository,
      };
    }

    if (action === 'remove') {
      return createRemovePlan(command, repository, state);
    }

    return {
      command,
      mode: 'explicit-update',
      title: 'Update workflow.',
      plannedChanges: [
        'Inspect existing managed Lotus artifacts.',
        'Prefill update choices from detected state.',
        'Prepare local-only project artifact updates.',
      ],
      resultMessage: 'Update workflow completed.',
      state,
      repository,
    };
  }

  if (command === 'remove') {
    return createRemovePlan(command, repository, state);
  }

  return {
    command,
    mode: 'diagnose',
    title: diagnosticMessages[command],
    plannedChanges: ['Inspect known Lotus-managed artifacts.', 'Report state without modifying unrelated repository files.'],
    resultMessage: `${command} workflow completed.`,
    state,
    repository,
  };
}

function createRemovePlan(command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan {
  return {
    command,
    mode: 'remove',
    title: 'Remove workflow.',
    plannedChanges:
      state.managedPaths.length > 0
        ? state.managedPaths.map((managedPath) => `Remove ${managedPath}.`)
        : ['No known Lotus-managed artifacts were found.'],
    resultMessage: 'Remove workflow completed.',
    state,
    repository,
  };
}

async function resolveUpdateAction(context: CommandContext): Promise<WorkflowAction> {
  if (context.updateAction !== undefined) {
    return context.updateAction;
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive) {
    return 'update';
  }

  const action = await select<WorkflowAction>({
    message: 'Existing Lotus state detected. Choose the next action.',
    options: [
      { value: 'update', label: 'Update', hint: 'Refresh managed Lotus artifacts.' },
      { value: 'remove', label: 'Remove', hint: 'Delete known Lotus-managed artifacts.' },
      { value: 'cancel', label: 'Cancel', hint: 'Exit without changing files.' },
    ],
  });

  if (isCancel(action)) {
    cancel('Canceled.');
    return 'cancel';
  }

  return action;
}

async function detectLotusState(repository: RepositoryState): Promise<LotusState> {
  const root = repository.root;

  if (root === null) {
    return {
      hasManagedState: false,
      managedPaths: [],
      missingManagedPaths: [...managedArtifactPaths],
    };
  }

  const existingPaths = await Promise.all(
    managedArtifactPaths.map(async (managedPath) => {
      const absolutePath = join(root, managedPath);

      try {
        await access(absolutePath);
        return managedPath;
      } catch {
        return null;
      }
    }),
  );

  const managedPaths = existingPaths.filter((managedPath): managedPath is (typeof managedArtifactPaths)[number] => managedPath !== null);

  return {
    hasManagedState: managedPaths.length > 0,
    managedPaths,
    missingManagedPaths: managedArtifactPaths.filter((managedPath) => !managedPaths.includes(managedPath)),
  };
}

function renderPlanSummary(plan: WorkflowPlan, context: CommandContext): void {
  context.stdout(`${pc.bold(plan.title)}\n`);
  context.stdout(`Repository: ${plan.repository.root}\n`);
  context.stdout(`Detected managed artifacts: ${plan.state.managedPaths.length > 0 ? plan.state.managedPaths.join(', ') : 'none'}\n`);
  context.stdout('Planned changes:\n');

  for (const plannedChange of plan.plannedChanges) {
    context.stdout(`- ${plannedChange}\n`);
  }
}

async function applyWorkflowPlan(plan: WorkflowPlan): Promise<string[]> {
  const appliedChanges: string[] = [];

  const task = new Listr(
    [
      {
        title: 'Run workflow tasks',
        task: async () => {
          if (plan.mode !== 'remove') {
            appliedChanges.push('No filesystem changes were required for this orchestration step.');
            return;
          }

          if (plan.repository.root === null || plan.state.managedPaths.length === 0) {
            appliedChanges.push('No managed artifacts were present.');
            return;
          }

          for (const managedPath of plan.state.managedPaths) {
            await rm(join(plan.repository.root, managedPath), { force: true });
            appliedChanges.push(`Removed ${managedPath}.`);
          }
        },
      },
    ],
    {
      renderer: 'silent',
    },
  );

  await task.run();
  return appliedChanges;
}

function renderResultSummary(plan: WorkflowPlan, appliedChanges: string[], context: CommandContext): void {
  context.stdout(`${pc.green('Result:')} ${plan.resultMessage}\n`);

  for (const appliedChange of appliedChanges) {
    context.stdout(`- ${appliedChange}\n`);
  }
}
