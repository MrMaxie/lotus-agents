import { Listr } from 'listr2';
import pc from 'picocolors';
import { detectRepository } from './repository.js';
import type { CliResult, CommandContext, RepositoryState } from './types.js';

type ProjectCommand = 'install' | 'update' | 'remove' | 'doctor' | 'validate';

const commandMessages: Record<ProjectCommand, string> = {
  install: 'Install routing is ready. Full LotusAgents artifact installation belongs to the broader MAX-72 installer work.',
  update: 'Update routing is ready. Existing-state update semantics belong to the broader MAX-72 installer work.',
  remove: 'Remove routing is ready. Managed artifact removal belongs to the broader MAX-72 installer work.',
  doctor: 'Doctor routing is ready. Semantic health checks and repair guidance belong to the broader MAX-72 validator work.',
  validate: 'Validate routing is ready. Zod-backed managed-file validation belongs to the broader MAX-72 validator work.',
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

  await renderCommandPlan(command, repository, context);
  return { exitCode: 0 };
}

async function renderCommandPlan(command: ProjectCommand, repository: RepositoryState, context: CommandContext): Promise<void> {
  const task = new Listr(
    [
      {
        title: `Route ${command} command`,
        task: () => {
          context.stdout(`${pc.green(commandMessages[command])}\n`);
        },
      },
    ],
    {
      renderer: 'silent',
    },
  );

  await task.run();

  context.stdout(`Repository: ${repository.root}\n`);
}
