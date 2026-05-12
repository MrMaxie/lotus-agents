import { access, lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { cancel, isCancel, select } from '@clack/prompts';
import { Listr } from 'listr2';
import pc from 'picocolors';
import { getManagedArtifact, lotusManifest, managedArtifactPaths } from './manifest.js';
import { detectRepository } from './repository.js';
import type { CliResult, CommandContext, RemoveScope, RepositoryState, WorkflowAction } from './types.js';

type ProjectCommand = 'install' | 'update' | 'remove' | 'doctor' | 'validate';

type WorkflowMode = 'fresh-install' | 'detected-update' | 'explicit-update' | 'remove' | 'cancel' | 'diagnose';
type DocsMode = 'committed' | 'local-only';

type LotusState = {
  hasManagedState: boolean;
  managedPaths: string[];
  missingManagedPaths: string[];
};

type InstallationConfiguration = {
  docsMode: DocsMode;
  detectedDocsArtifacts: string[];
};

type WorkflowPlan = {
  command: ProjectCommand;
  mode: WorkflowMode;
  title: string;
  plannedChanges: string[];
  resultMessage: string;
  state: LotusState;
  repository: RepositoryState;
  configuration?: InstallationConfiguration;
  removeScope?: RemoveScope;
  selectedManagedPaths?: string[];
};

const diagnosticMessages: Record<'doctor' | 'validate', string> = {
  doctor: 'Inspect managed Lotus project state and report repair guidance.',
  validate: 'Validate known Lotus-managed project artifacts against the manifest.',
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
      return createUpdateActionPlan(command, repository, state, context, 'detected-update');
    }

    return createFreshInstallPlan(command, repository, state);
  }

  if (command === 'update') {
    if (!state.hasManagedState) {
      return createFreshInstallPlan(command, repository, state, 'No existing Lotus state detected; running fresh install workflow.');
    }

    return createUpdateActionPlan(command, repository, state, context, 'explicit-update');
  }

  if (command === 'remove') {
    return createRemovePlan(command, repository, state, context);
  }

  return {
    command,
    mode: 'diagnose',
    title: diagnosticMessages[command],
    plannedChanges: [
      `Validate Lotus-managed artifact manifest schema v${lotusManifest.schemaVersion} with Zod.`,
      'Inspect known Lotus-managed artifacts.',
      'Report state without modifying unrelated repository files.',
    ],
    resultMessage: `${command} workflow completed.`,
    state,
    repository,
  };
}

async function createUpdateActionPlan(
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
  mode: Extract<WorkflowMode, 'detected-update' | 'explicit-update'>,
): Promise<WorkflowPlan> {
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
    return createRemovePlan(command, repository, state, context);
  }

  const configuration = createInstallationConfiguration(state);

  return {
    command,
    mode,
    title: mode === 'detected-update' ? 'Existing Lotus state detected; running update workflow.' : 'Update workflow.',
    plannedChanges: [
      'Inspect existing managed Lotus artifacts.',
      `Prefill installation configuration from detected state: .docs ${configuration.docsMode}.`,
      'Prepare local-only project artifact updates.',
    ],
    resultMessage: 'Update workflow completed.',
    state,
    repository,
    configuration,
  };
}

function createFreshInstallPlan(
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  title = 'Fresh install workflow.',
): WorkflowPlan {
  return {
    command,
    mode: 'fresh-install',
    title,
    plannedChanges: [
      'Prepare local Lotus project artifacts in this repository.',
      'Keep project artifacts local even when the CLI is run globally.',
      'Configure .docs visibility from the repository adoption choice.',
      'Leave private values out of package templates and public docs.',
    ],
    resultMessage: 'Install workflow completed.',
    state,
    repository,
    configuration: createInstallationConfiguration(state),
  };
}

async function createRemovePlan(
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
): Promise<WorkflowPlan> {
  const removeScope = await resolveRemoveScope(context, state);

  if (removeScope === 'cancel') {
    return {
      command,
      mode: 'cancel',
      title: 'Remove canceled before applying changes.',
      plannedChanges: ['No files will be changed.'],
      resultMessage: 'No changes applied.',
      state,
      repository,
    };
  }

  const selectedManagedPaths = filterManagedPathsByScope(state.managedPaths, removeScope);

  return {
    command,
    mode: 'remove',
    title: `Remove workflow (${formatRemoveScope(removeScope)}).`,
    plannedChanges:
      selectedManagedPaths.length > 0
        ? selectedManagedPaths.map((managedPath) => `Remove ${managedPath}.`)
        : [`No known Lotus-managed artifacts were found for ${formatRemoveScope(removeScope)}.`],
    resultMessage: 'Remove workflow completed.',
    state,
    repository,
    removeScope,
    selectedManagedPaths,
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

async function resolveRemoveScope(context: CommandContext, state: LotusState): Promise<RemoveScope | 'cancel'> {
  if (context.removeScope !== undefined) {
    return context.removeScope;
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive || !state.hasManagedState) {
    return 'all';
  }

  const scope = await select<RemoveScope>({
    message: 'Choose which Lotus-managed artifacts to remove.',
    options: [
      { value: 'all', label: 'All', hint: 'Delete all detected Lotus-managed artifacts.' },
      { value: 'local', label: '.local only', hint: 'Delete detected private Lotus artifacts.' },
      { value: 'docs', label: '.docs only', hint: 'Delete detected documentation workflow artifacts.' },
    ],
  });

  if (isCancel(scope)) {
    cancel('Canceled.');
    return 'cancel';
  }

  return scope;
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

  const existingPaths: Array<string | null> = await Promise.all(
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

  const managedPaths = existingPaths.filter((managedPath): managedPath is string => managedPath !== null);

  return {
    hasManagedState: managedPaths.length > 0,
    managedPaths,
    missingManagedPaths: managedArtifactPaths.filter((managedPath) => !managedPaths.includes(managedPath)),
  };
}

function renderPlanSummary(plan: WorkflowPlan, context: CommandContext): void {
  context.stdout(`${pc.bold(plan.title)}\n`);
  context.stdout(`Repository: ${plan.repository.root}\n`);
  context.stdout(`Manifest schema: v${lotusManifest.schemaVersion}\n`);
  context.stdout(`Detected managed artifacts: ${plan.state.managedPaths.length > 0 ? plan.state.managedPaths.join(', ') : 'none'}\n`);

  if (plan.configuration !== undefined) {
    context.stdout('Installation configuration:\n');
    context.stdout(`- .docs mode: ${plan.configuration.docsMode}\n`);
    context.stdout(
      `- Prefilled from detected .docs artifacts: ${
        plan.configuration.detectedDocsArtifacts.length > 0 ? plan.configuration.detectedDocsArtifacts.join(', ') : 'none'
      }\n`,
    );
  }

  if (plan.removeScope !== undefined) {
    context.stdout(`Selected remove scope: ${formatRemoveScope(plan.removeScope)}\n`);
  }

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

          const selectedManagedPaths = plan.selectedManagedPaths ?? plan.state.managedPaths;

          if (plan.repository.root === null || selectedManagedPaths.length === 0) {
            appliedChanges.push('No managed artifacts were present.');
            return;
          }

          for (const managedPath of selectedManagedPaths) {
            const absolutePath = join(plan.repository.root, managedPath);
            const stats = await lstat(absolutePath);

            await rm(absolutePath, { force: true, recursive: stats.isDirectory() });
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

function createInstallationConfiguration(state: LotusState): InstallationConfiguration {
  const detectedDocsArtifacts = state.managedPaths.filter((managedPath) => getManagedArtifact(managedPath)?.scope === 'docs');

  return {
    docsMode: detectedDocsArtifacts.length > 0 ? 'committed' : 'local-only',
    detectedDocsArtifacts,
  };
}

function filterManagedPathsByScope(managedPaths: string[], removeScope: RemoveScope): string[] {
  if (removeScope === 'all') {
    return managedPaths;
  }

  return managedPaths.filter((managedPath) => getManagedArtifact(managedPath)?.scope === removeScope);
}

function formatRemoveScope(removeScope: RemoveScope): string {
  if (removeScope === 'local') {
    return '.local artifacts';
  }

  if (removeScope === 'docs') {
    return '.docs artifacts';
  }

  return 'all artifacts';
}
