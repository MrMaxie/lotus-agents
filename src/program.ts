import { Command } from 'commander';
import { ProjectCommand, projectCommandSchema, runProjectCommand } from './commands';
import { type LotusAgent, lotusAgentSchema } from './manifest';
import { packageInfo } from './packageInfo';
import type { CliResult, CommandContext } from './types';

const exitCodeStore = new WeakMap<Command, number>();

export function buildProgram(context: CommandContext): Command {
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
      .option('--no-agent-artifacts', 'Do not generate or update agent artifacts.');

    projectCommand.action(
      async (options: { agent?: LotusAgent[]; force?: boolean; recommendedAgents?: boolean; agentArtifacts?: boolean } = {}) => {
        context.stdout(`LotusAgents ${command}\n`);
        const result = await runProjectCommand(command, {
          ...context,
          forceReinstall: context.forceReinstall === true || options.force === true,
          selectedAgents: options.agent !== undefined && options.agent.length > 0 ? options.agent : context.selectedAgents,
          selectRecommendedAgents: context.selectRecommendedAgents === true || options.recommendedAgents === true,
          noAgentArtifacts: context.noAgentArtifacts === true || options.agentArtifacts === false,
        });
        context.stdout(result.exitCode === 0 ? 'Done.\n' : 'Command stopped.\n');
        exitCodeStore.set(program, result.exitCode);
      },
    );
  }

  return program;
}

export async function runCli(argv = process.argv, options: Partial<CommandContext> = {}): Promise<CliResult> {
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
}

function collectAgentSelection(value: string, previous: LotusAgent[]): LotusAgent[] {
  return [...previous, lotusAgentSchema.parse(value)];
}

function isCommanderExit(error: unknown): error is { code: string; exitCode: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'exitCode' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    typeof (error as { exitCode: unknown }).exitCode === 'number'
  );
}
