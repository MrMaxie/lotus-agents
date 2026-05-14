import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { match } from 'ts-pattern';
import { getManagedArtifact, type LotusProfile, lotusManifest, ManagedArtifactScope, managedArtifacts } from '../manifest';
import { ProjectCommand } from '../projectCommands';
import { type LotusState, LotusStateStatus } from '../state';
import { type CommandContext, RemoveScope, type RepositoryState, WorkflowAction } from '../types';
import { createInstallationConfiguration } from './installationConfiguration';
import { formatRemoveScope, formatUserEditableManagedPaths } from './workflowFormatting';
import { isWorkflowPromptCanceledError, resolveRemoveScope, resolveUpdateAction } from './workflowPrompts';
import { WorkflowMode, type WorkflowPlan } from './workflowTypes';

const diagnosticMessages: Record<ProjectCommand.Doctor | ProjectCommand.Validate, string> = {
  [ProjectCommand.Doctor]: 'Inspect managed Lotus project state and report repair guidance.',
  [ProjectCommand.Validate]: 'Validate known Lotus-managed project artifacts against the manifest.',
};

export const createWorkflowPlan = async (
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
): Promise<WorkflowPlan> => {
  return match(command)
    .with(ProjectCommand.Install, () => {
      if (state.hasManagedState) {
        return createUpdateActionPlan(command, repository, state, context, WorkflowMode.DetectedUpdate);
      }

      return createFreshInstallPlan(command, repository, state, context);
    })
    .with(ProjectCommand.Update, () => {
      if (!state.hasManagedState) {
        return createFreshInstallPlan(
          command,
          repository,
          state,
          context,
          'No existing Lotus state detected; running fresh install workflow.',
        );
      }

      return createUpdateActionPlan(command, repository, state, context, WorkflowMode.ExplicitUpdate);
    })
    .with(ProjectCommand.Remove, () => createRemovePlan(command, repository, state, context))
    .with(ProjectCommand.Doctor, () => createDiagnosticPlan(ProjectCommand.Doctor, repository, state))
    .with(ProjectCommand.Validate, () => createDiagnosticPlan(ProjectCommand.Validate, repository, state))
    .exhaustive();
};

const createDiagnosticPlan = (
  command: ProjectCommand.Doctor | ProjectCommand.Validate,
  repository: RepositoryState,
  state: LotusState,
): WorkflowPlan => {
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
};

const createUpdateActionPlan = async (
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
  mode: WorkflowMode.DetectedUpdate | WorkflowMode.ExplicitUpdate,
): Promise<WorkflowPlan> => {
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

  const configuration = await createInstallationConfiguration(repository, state, context).catch((error: unknown) => {
    if (isWorkflowPromptCanceledError(error)) {
      return null;
    }

    throw error;
  });

  if (configuration === null) {
    return createCanceledPlan(command, repository, state);
  }

  if (configuration.selectedProfiles.length === 0) {
    return createRemovePlan(command, repository, state, context, 'No Lotus profiles were selected; removing profile artifacts.');
  }

  return {
    command,
    mode,
    title: mode === WorkflowMode.DetectedUpdate ? 'Existing Lotus state detected; running update workflow.' : 'Update workflow.',
    plannedChanges: [
      'Inspect existing managed Lotus artifacts.',
      `Prefill installation configuration from detected state: .docs ${configuration.docsMode}.`,
      `Use selected profiles: ${configuration.selectedProfiles.join(', ')}.`,
      'Write private workflow configuration to .local/workflow.lotus.json.',
      'Prepare local-only project artifact updates.',
    ],
    resultMessage: 'Update workflow completed.',
    state,
    repository,
    configuration,
  };
};

const createRepairGuidancePlan = (command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan => {
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
};

const createForceReinstallPlan = (command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan => {
  const forceReinstallArtifacts = getForceReinstallArtifacts(state.selectedProfiles);

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
    forceReinstallArtifacts,
  };
};

const getForceReinstallArtifacts = (selectedProfiles: LotusProfile[] | null) => {
  if (selectedProfiles === null || selectedProfiles.length === 0) {
    return managedArtifacts;
  }

  const selectedProfileSet = new Set(selectedProfiles);

  return managedArtifacts.filter((artifact) => artifact.metadata.selectedProfiles.some((profile) => selectedProfileSet.has(profile)));
};

const createExternalCorruptionPlan = (command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan => {
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
};

const createFreshInstallPlan = async (
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
  title = 'Fresh install workflow.',
): Promise<WorkflowPlan> => {
  const configuration = await createInstallationConfiguration(repository, state, context).catch((error: unknown) => {
    if (isWorkflowPromptCanceledError(error)) {
      return null;
    }

    throw error;
  });

  if (configuration === null) {
    return createCanceledPlan(command, repository, state);
  }

  if (configuration.selectedProfiles.length === 0) {
    return createRemovePlan(command, repository, state, context, 'No Lotus profiles were selected; removing profile artifacts.');
  }

  return {
    command,
    mode: WorkflowMode.FreshInstall,
    title,
    plannedChanges: [
      'Prepare local Lotus project artifacts in this repository.',
      'Keep project artifacts local even when the CLI is run globally.',
      `Use selected profiles: ${configuration.selectedProfiles.join(', ')}.`,
      'Write private workflow configuration to .local/workflow.lotus.json and private workflow notes to .local/WORKFLOW.md.',
      'Configure .docs visibility from the repository adoption choice.',
      'Detect likely available coding agents and report what was found.',
      'Generate selected agent entrypoint files using common-first conventions.',
      'Leave private values out of package templates and public docs.',
    ],
    resultMessage: 'Install workflow completed.',
    state,
    repository,
    configuration,
  };
};

const createRemovePlan = async (
  command: ProjectCommand,
  repository: RepositoryState,
  state: LotusState,
  context: CommandContext,
  title = `Remove workflow`,
): Promise<WorkflowPlan> => {
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

  const managedPathsForRemoval = await getManagedPathsForRemoval(repository, state);
  const selectedManagedPaths = filterManagedPathsByScope(managedPathsForRemoval, removeScope);

  return {
    command,
    mode: WorkflowMode.Remove,
    title: title === 'Remove workflow' ? `Remove workflow (${formatRemoveScope(removeScope)}).` : title,
    plannedChanges:
      selectedManagedPaths.length > 0
        ? selectedManagedPaths.map((managedPath) => `Remove ${managedPath}.`)
        : [`No known Lotus-managed artifacts were found for ${formatRemoveScope(removeScope)}.`],
    resultMessage: 'Remove workflow completed.',
    state,
    repository,
    removeScope,
    selectedManagedPaths,
    selectedAgentsForRemoval: context.selectedAgents,
    shouldRemoveAgentArtifacts: context.noAgentArtifacts !== true,
  };
};

const createCanceledPlan = (command: ProjectCommand, repository: RepositoryState, state: LotusState): WorkflowPlan => ({
  command,
  mode: WorkflowMode.Cancel,
  title: 'Workflow canceled before applying changes.',
  plannedChanges: ['No files will be changed.'],
  resultMessage: 'No changes applied.',
  state,
  repository,
});

const getManagedPathsForRemoval = async (repository: RepositoryState, state: LotusState): Promise<string[]> => {
  if (repository.root === null) {
    return state.managedPaths;
  }

  const root = repository.root;
  const invalidManagedPaths = new Set(state.invalidManagedPaths.map((invalidPath) => invalidPath.path));
  const presentPaths = await Promise.all(
    managedArtifacts.map(async (artifact) => {
      if (invalidManagedPaths.has(artifact.path)) {
        return null;
      }

      const stats = await lstat(join(root, artifact.path)).catch((error: unknown) => {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          return null;
        }

        throw error;
      });

      return stats === null ? null : artifact.path;
    }),
  );

  return presentPaths.filter((managedPath): managedPath is string => managedPath !== null);
};

const filterManagedPathsByScope = (managedPaths: string[], removeScope: RemoveScope): string[] => {
  return match(removeScope)
    .with(RemoveScope.All, () => managedPaths)
    .with(RemoveScope.Local, () =>
      managedPaths.filter((managedPath) => getManagedArtifact(managedPath)?.scope === ManagedArtifactScope.Local),
    )
    .with(RemoveScope.Docs, () =>
      managedPaths.filter((managedPath) => getManagedArtifact(managedPath)?.scope === ManagedArtifactScope.Docs),
    )
    .exhaustive();
};
