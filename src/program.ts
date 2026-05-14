import { Command } from 'commander';
import { ProjectCommand, projectCommandSchema, runProjectCommand } from './commands';
import { type LotusAgent, type LotusProfile, lotusAgentSchema, lotusProfileSchema } from './manifest';
import { packageInfo } from './packageInfo';
import type { CliResult, CommandContext } from './types';
import { remoteTaskSources, type SourceOfTruthMode, sourceOfTruthModeSchema, type TaskSource, taskSourceSchema } from './workflowConfig';

const exitCodeStore = new WeakMap<Command, number>();

export const buildProgram = (context: CommandContext): Command => {
  const program = new Command();

  program
    .name('lotusagents')
    .description(packageInfo.description)
    .version(packageInfo.version)
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (message) => context.stdout(message),
      writeErr: (message) => context.stderr(message),
      outputError: (message, write) => write(message),
    });

  for (const command of projectCommandSchema.options) {
    const projectCommand = program.command(command).description(`Route the LotusAgents ${command} workflow for the current repository.`);

    if (command === ProjectCommand.Install || command === ProjectCommand.Update) {
      projectCommand.option('--force', 'Force reinstall known Lotus-managed artifacts when repair is needed.');
    }

    projectCommand
      .option('--agent <agent>', 'Select an agent artifact to manage; repeat for multiple agents.', collectAgentSelection, [])
      .option('--recommended-agents', 'Select all detected agent artifacts.')
      .option('--no-agent-artifacts', 'Do not generate or update agent artifacts.')
      .option('--profile <profile>', 'Select a workflow profile; repeat for multiple profiles.', collectProfileSelection, [])
      .option('--no-profiles', 'Select no Lotus profiles and remove Lotus profile artifacts.')
      .option(
        '--task-source <source>',
        'Select a remote or interactive task source; repeat for multiple sources.',
        collectTaskSourceSelection,
        [],
      )
      .option('--source-mode <source=mode>', 'Set source-of-truth mode for a selected task source.', collectTaskSourceMode, {})
      .option(
        '--write-source <source>',
        'Allow write/update/respond behavior for a selected task source.',
        collectWriteSourceSelection,
        [],
      );

    projectCommand.action(
      async (
        options: {
          agent?: LotusAgent[];
          force?: boolean;
          recommendedAgents?: boolean;
          agentArtifacts?: boolean;
          profiles?: boolean;
          profile?: LotusProfile[];
          taskSource?: TaskSource[];
          sourceMode?: Partial<Record<TaskSource, SourceOfTruthMode>>;
          writeSource?: TaskSource[];
        } = {},
      ) => {
        context.stdout(`LotusAgents ${command}\n`);
        const selectedTaskSources =
          options.taskSource !== undefined && options.taskSource.length > 0 ? options.taskSource : context.selectedTaskSources;
        const taskSourceModes = Object.keys(options.sourceMode ?? {}).length > 0 ? options.sourceMode : context.taskSourceModes;
        const writeEnabledTaskSources =
          options.writeSource !== undefined && options.writeSource.length > 0 ? options.writeSource : context.writeEnabledTaskSources;
        const taskSourceSelectionError = validateConfiguredTaskSources(selectedTaskSources, taskSourceModes, writeEnabledTaskSources);

        if (taskSourceSelectionError !== null) {
          context.stderr(`${taskSourceSelectionError}\n`);
          exitCodeStore.set(program, 1);
          return;
        }

        const result = await runProjectCommand(command, {
          ...context,
          forceReinstall: context.forceReinstall === true || options.force === true,
          selectedAgents: options.agent !== undefined && options.agent.length > 0 ? options.agent : context.selectedAgents,
          selectRecommendedAgents: context.selectRecommendedAgents === true || options.recommendedAgents === true,
          noAgentArtifacts: context.noAgentArtifacts === true || options.agentArtifacts === false,
          selectedProfiles:
            options.profiles === false
              ? []
              : options.profile !== undefined && options.profile.length > 0
                ? options.profile
                : context.selectedProfiles,
          selectedTaskSources,
          taskSourceModes,
          writeEnabledTaskSources,
        });
        context.stdout(result.exitCode === 0 ? 'Done.\n' : 'Command stopped.\n');
        exitCodeStore.set(program, result.exitCode);
      },
    );
  }

  return program;
};

export const runCli = async (argv = process.argv, options: Partial<CommandContext> = {}): Promise<CliResult> => {
  const context: CommandContext = {
    cwd: options.cwd ?? process.cwd(),
    stdout: options.stdout ?? ((message) => process.stdout.write(message)),
    stderr: options.stderr ?? ((message) => process.stderr.write(message)),
    isInteractive: options.isInteractive,
    updateAction: options.updateAction,
    removeScope: options.removeScope,
    forceReinstall: options.forceReinstall,
    selectedAgents: options.selectedAgents,
    selectRecommendedAgents: options.selectRecommendedAgents,
    noAgentArtifacts: options.noAgentArtifacts,
    selectedProfiles: options.selectedProfiles,
    selectedTaskSources: options.selectedTaskSources,
    taskSourceModes: options.taskSourceModes,
    writeEnabledTaskSources: options.writeEnabledTaskSources,
  };

  const program = buildProgram(context);

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (isCommanderExit(error)) {
      return { exitCode: error.exitCode };
    }

    throw error;
  }

  return { exitCode: exitCodeStore.get(program) ?? 0 };
};

const collectAgentSelection = (value: string, previous: LotusAgent[]): LotusAgent[] => {
  return [...previous, lotusAgentSchema.parse(value)];
};

const collectProfileSelection = (value: string, previous: LotusProfile[]): LotusProfile[] => {
  return [...previous, lotusProfileSchema.parse(value)];
};

const collectTaskSourceSelection = (value: string, previous: TaskSource[]): TaskSource[] => {
  const source = taskSourceSchema.parse(value);

  if (!remoteTaskSources.includes(source as (typeof remoteTaskSources)[number])) {
    throw new Error(`--task-source only accepts remote or interactive sources: ${remoteTaskSources.join(', ')}.`);
  }

  return [...previous, source];
};

const collectWriteSourceSelection = (value: string, previous: TaskSource[]): TaskSource[] => {
  const source = taskSourceSchema.parse(value);

  if (!remoteTaskSources.includes(source as (typeof remoteTaskSources)[number])) {
    throw new Error(`--write-source only accepts remote or interactive sources: ${remoteTaskSources.join(', ')}.`);
  }

  return [...previous, source];
};

const collectTaskSourceMode = (value: string, previous: Partial<Record<TaskSource, SourceOfTruthMode>>) => {
  const [rawSource, rawMode] = value.split('=');

  if (rawSource === undefined || rawMode === undefined) {
    throw new Error('--source-mode must use <source=mode>.');
  }

  return {
    ...previous,
    [taskSourceSchema.parse(rawSource)]: sourceOfTruthModeSchema.parse(sourceOfTruthModeAliases[rawMode] ?? rawMode),
  };
};

const sourceOfTruthModeAliases: Record<string, SourceOfTruthMode> = {
  readonly: 'readonly-source-of-truth' as SourceOfTruthMode,
  'read-write': 'read-write-source-of-truth' as SourceOfTruthMode,
  operational: 'operational-source-of-truth' as SourceOfTruthMode,
};

const validateConfiguredTaskSources = (
  selectedTaskSources: TaskSource[] | undefined,
  taskSourceModes: Partial<Record<TaskSource, SourceOfTruthMode>> | undefined,
  writeEnabledTaskSources: TaskSource[] | undefined,
): string | null => {
  const selectedSources = new Set(selectedTaskSources ?? []);
  const modeSources = Object.keys(taskSourceModes ?? {}) as TaskSource[];
  const missingModeSources = modeSources.filter((source) => !selectedSources.has(source));
  const missingWriteSources = (writeEnabledTaskSources ?? []).filter((source) => !selectedSources.has(source));

  if (missingModeSources.length > 0) {
    return `--source-mode requires selected task sources: ${missingModeSources.join(', ')}. Add matching --task-source options.`;
  }

  if (missingWriteSources.length > 0) {
    return `--write-source requires selected task sources: ${missingWriteSources.join(', ')}. Add matching --task-source options.`;
  }

  return null;
};

const isCommanderExit = (error: unknown): error is { code: string; exitCode: number } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'exitCode' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    typeof (error as { exitCode: unknown }).exitCode === 'number'
  );
};
