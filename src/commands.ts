import { copyFile, lstat, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cancel, isCancel, select } from '@clack/prompts';
import { Listr } from 'listr2';
import pc from 'picocolors';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { enumValues } from './enumValues';
import { getManagedArtifact, lotusManifest, type ManagedArtifact, ManagedArtifactScope, managedArtifacts } from './manifest';
import { detectRepository } from './repository';
import { detectLotusState, type LotusState, LotusStateStatus } from './state';
import {
  type CliResult,
  type CommandContext,
  RemoveScope,
  type RepositoryState,
  removeScopeSchema,
  WorkflowAction,
  workflowActionSchema,
} from './types';

export enum ProjectCommand {
  Install = 'install',
  Update = 'update',
  Remove = 'remove',
  Doctor = 'doctor',
  Validate = 'validate',
}

export enum DocsMode {
  Committed = 'committed',
  LocalOnly = 'local-only',
}

enum WorkflowMode {
  FreshInstall = 'fresh-install',
  DetectedUpdate = 'detected-update',
  ExplicitUpdate = 'explicit-update',
  RepairGuidance = 'repair-guidance',
  ForceReinstall = 'force-reinstall',
  Remove = 'remove',
  Cancel = 'cancel',
  Diagnose = 'diagnose',
  Blocked = 'blocked',
}

export const projectCommandSchema = z.enum(enumValues(ProjectCommand));
export const docsModeSchema = z.enum(enumValues(DocsMode));

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
  forceReinstallArtifacts?: ManagedArtifact[];
};

const diagnosticMessages: Record<ProjectCommand.Doctor | ProjectCommand.Validate, string> = {
  [ProjectCommand.Doctor]: 'Inspect managed Lotus project state and report repair guidance.',
  [ProjectCommand.Validate]: 'Validate known Lotus-managed project artifacts against the manifest.',
};

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(moduleDirectory, '..');
const reinstallAssetsByPath: Record<string, { sourcePath: string; targetFileName?: string }> = {
  '.local/AGENTS.md': { sourcePath: 'lotus-local/lotus-init/assets/local-agents.md' },
  '.local/issues': { sourcePath: 'lotus-local/lotus-init/assets/local-issues.lotus.json', targetFileName: '.lotus.json' },
  '.local/issues-notes': { sourcePath: 'lotus-local/lotus-init/assets/local-issues-notes.lotus.json', targetFileName: '.lotus.json' },
  '.local/reviews': { sourcePath: 'lotus-local/lotus-init/assets/local-reviews.lotus.json', targetFileName: '.lotus.json' },
  '.local/pr-notes': { sourcePath: 'lotus-local/lotus-init/assets/local-pr-notes.lotus.json', targetFileName: '.lotus.json' },
  '.docs/AGENTS.md': { sourcePath: 'lotus-local/lotus-init/assets/docs-agents.md' },
  '.docs/spec': { sourcePath: 'lotus-local/lotus-init/assets/docs-spec.lotus.json', targetFileName: '.lotus.json' },
  '.docs/meetings/_draft.md': { sourcePath: 'lotus-local/lotus-init/assets/meetings-draft-template.md' },
  '.docs/templates': { sourcePath: 'lotus-local/lotus-init/assets/docs-templates.lotus.json', targetFileName: '.lotus.json' },
};

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

async function createWorkflowPlan(
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
): Promise<WorkflowPlan> {
  return match(command)
    .with(ProjectCommand.Install, () => {
      if (state.hasManagedState) {
        return createUpdateActionPlan(command, repository, state, context, WorkflowMode.DetectedUpdate);
      }

      return createFreshInstallPlan(command, repository, state);
    })
    .with(ProjectCommand.Update, () => {
      if (!state.hasManagedState) {
        return createFreshInstallPlan(command, repository, state, 'No existing Lotus state detected; running fresh install workflow.');
      }

      return createUpdateActionPlan(command, repository, state, context, WorkflowMode.ExplicitUpdate);
    })
    .with(ProjectCommand.Remove, () => createRemovePlan(command, repository, state, context))
    .with(ProjectCommand.Doctor, () => createDiagnosticPlan(ProjectCommand.Doctor, repository, state))
    .with(ProjectCommand.Validate, () => createDiagnosticPlan(ProjectCommand.Validate, repository, state))
    .exhaustive();
}

function createDiagnosticPlan(
  command: ProjectCommand.Doctor | ProjectCommand.Validate,
  repository: RepositoryState,
  state: LotusState,
): WorkflowPlan {
  return {
    command,
    mode: WorkflowMode.Diagnose,
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
  mode: WorkflowMode.DetectedUpdate | WorkflowMode.ExplicitUpdate,
): Promise<WorkflowPlan> {
  const action = await resolveUpdateAction(context);

  const actionPlan = await match(action)
    .with(WorkflowAction.Cancel, () => ({
      command,
      mode: WorkflowMode.Cancel,
      title: 'Update canceled before applying changes.',
      plannedChanges: ['No files will be changed.'],
      resultMessage: 'No changes applied.',
      state,
      repository,
    }))
    .with(WorkflowAction.Remove, () => createRemovePlan(command, repository, state, context))
    .with(WorkflowAction.Update, () => null)
    .exhaustive();

  if (actionPlan !== null) {
    return actionPlan;
  }

  if (state.status === LotusStateStatus.ExternalCorruption) {
    return createExternalCorruptionPlan(command, repository, state);
  }

  if (context.forceReinstall === true) {
    return createForceReinstallPlan(command, repository, state);
  }

  if (state.status === LotusStateStatus.DamagedLotusArtifact) {
    return createRepairGuidancePlan(command, repository, state);
  }

  const configuration = createInstallationConfiguration(state);

  return {
    command,
    mode,
    title: mode === WorkflowMode.DetectedUpdate ? 'Existing Lotus state detected; running update workflow.' : 'Update workflow.',
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

function createRepairGuidancePlan(command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan {
  const affectedPaths = state.diagnostics.map((diagnostic) => diagnostic.path);
  const uniqueAffectedPaths = [...new Set(affectedPaths)];

  return {
    command,
    mode: WorkflowMode.RepairGuidance,
    title: 'Repair workflow required for damaged Lotus-managed artifacts.',
    plannedChanges: [
      'Stop before overwriting files because Lotus-owned metadata or artifact shape is damaged.',
      `Affected Lotus paths: ${uniqueAffectedPaths.length > 0 ? uniqueAffectedPaths.join(', ') : 'see diagnostics above'}.`,
      'Repair the listed Lotus metadata manually, then rerun `lotusagents validate`.',
      'Or run `lotusagents update --force` to replace known Lotus-managed artifacts from bundled templates.',
      `Forced reinstall will replace user-editable managed artifacts: ${formatUserEditableManagedPaths()}.`,
      'Unrelated external configuration will not be changed.',
    ],
    resultMessage: 'Repair guidance completed.',
    state,
    repository,
  };
}

function createForceReinstallPlan(command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan {
  return {
    command,
    mode: WorkflowMode.ForceReinstall,
    title: 'Forced reinstall workflow.',
    plannedChanges: [
      'Refresh only known Lotus-managed file artifacts and directory metadata from the manifest.',
      'Preserve existing contents inside managed directories unless the managed path has the wrong filesystem kind.',
      'Recreate damaged or wrong-kind managed paths before writing bundled Lotus templates.',
      `Warn before replacing user-editable managed artifacts: ${formatUserEditableManagedPaths()}.`,
      'Leave unrelated external configuration untouched.',
    ],
    resultMessage: 'Forced reinstall completed.',
    state,
    repository,
    forceReinstallArtifacts: managedArtifacts,
  };
}

function createExternalCorruptionPlan(command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan {
  return {
    command,
    mode: WorkflowMode.Blocked,
    title: 'External configuration is broken outside Lotus repair scope.',
    plannedChanges: [
      'Stop before applying Lotus artifact changes.',
      'Fix the affected external file shown in diagnostics, then rerun the Lotus command.',
      'Lotus will not rewrite unrelated external configuration.',
    ],
    resultMessage: 'No Lotus repair changes applied.',
    state,
    repository,
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
    mode: WorkflowMode.FreshInstall,
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

  if (removeScope === WorkflowAction.Cancel) {
    return {
      command,
      mode: WorkflowMode.Cancel,
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
    mode: WorkflowMode.Remove,
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

async function resolveRemoveScope(context: CommandContext, state: LotusState): Promise<RemoveScope | WorkflowAction.Cancel> {
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

function renderPlanSummary(plan: WorkflowPlan, context: CommandContext): void {
  context.stdout(`${pc.bold(plan.title)}\n`);
  context.stdout(`Repository: ${plan.repository.root}\n`);
  context.stdout(`Manifest schema: v${lotusManifest.schemaVersion}\n`);
  context.stdout(`State: ${plan.state.status} (${plan.state.reasonCode})\n`);
  context.stdout(`Detected managed artifacts: ${plan.state.managedPaths.length > 0 ? plan.state.managedPaths.join(', ') : 'none'}\n`);

  if (plan.state.invalidManagedPaths.length > 0) {
    context.stdout(
      `Invalid managed artifact shapes: ${plan.state.invalidManagedPaths
        .map((artifact) => `${artifact.path} (expected ${artifact.expectedKind}, found ${artifact.actualKind})`)
        .join(', ')}\n`,
    );
  }

  if (plan.state.diagnostics.length > 0) {
    context.stdout('Diagnostics:\n');

    for (const diagnostic of plan.state.diagnostics) {
      context.stdout(`- ${diagnostic.path} ${diagnostic.reasonCode}: ${diagnostic.message}\n`);
    }
  }

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
          if (plan.mode === WorkflowMode.ForceReinstall) {
            if (plan.repository.root === null) {
              appliedChanges.push('No repository root was available.');
              return;
            }

            for (const artifact of plan.forceReinstallArtifacts ?? []) {
              await reinstallManagedArtifact(plan.repository.root, artifact);
              appliedChanges.push(`Reinstalled ${artifact.path}.`);
            }

            return;
          }

          if (plan.mode !== WorkflowMode.Remove) {
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

async function reinstallManagedArtifact(root: string, artifact: ManagedArtifact): Promise<void> {
  const absolutePath = join(root, artifact.path);
  const asset = reinstallAssetsByPath[artifact.path];

  if (asset === undefined) {
    throw new Error(`Missing bundled reinstall asset for ${artifact.path}.`);
  }

  if (artifact.kind === 'directory') {
    const stats = await lstat(absolutePath).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    });

    if (stats !== null && !stats.isDirectory()) {
      await rm(absolutePath, { force: true, recursive: true });
    }

    await mkdir(absolutePath, { recursive: true });
    const targetPath = join(absolutePath, asset.targetFileName ?? '.lotus.json');

    await rm(targetPath, { force: true, recursive: true });
    await copyFile(join(packageRoot, asset.sourcePath), targetPath);

    return;
  }

  await rm(absolutePath, { force: true, recursive: true });
  await mkdir(dirname(absolutePath), { recursive: true });
  await copyFile(join(packageRoot, asset.sourcePath), absolutePath);
}

function renderResultSummary(plan: WorkflowPlan, appliedChanges: string[], context: CommandContext): void {
  context.stdout(`${pc.green('Result:')} ${plan.resultMessage}\n`);

  for (const appliedChange of appliedChanges) {
    context.stdout(`- ${appliedChange}\n`);
  }
}

function createInstallationConfiguration(state: LotusState): InstallationConfiguration {
  const detectedDocsArtifacts = state.managedPaths.filter(
    (managedPath) => getManagedArtifact(managedPath)?.scope === ManagedArtifactScope.Docs,
  );

  return {
    docsMode: detectedDocsArtifacts.length > 0 ? DocsMode.Committed : DocsMode.LocalOnly,
    detectedDocsArtifacts,
  };
}

function filterManagedPathsByScope(managedPaths: string[], removeScope: RemoveScope): string[] {
  return match(removeScope)
    .with(RemoveScope.All, () => managedPaths)
    .with(RemoveScope.Local, () =>
      managedPaths.filter((managedPath) => getManagedArtifact(managedPath)?.scope === ManagedArtifactScope.Local),
    )
    .with(RemoveScope.Docs, () =>
      managedPaths.filter((managedPath) => getManagedArtifact(managedPath)?.scope === ManagedArtifactScope.Docs),
    )
    .exhaustive();
}

function formatRemoveScope(removeScope: RemoveScope): string {
  return match(removeScope)
    .with(RemoveScope.Local, () => '.local artifacts')
    .with(RemoveScope.Docs, () => '.docs artifacts')
    .with(RemoveScope.All, () => 'all artifacts')
    .exhaustive();
}

function formatUserEditableManagedPaths(): string {
  return managedArtifacts
    .filter((artifact) => artifact.metadata.contentClass === 'user-editable')
    .map((artifact) => artifact.path)
    .join(', ');
}
