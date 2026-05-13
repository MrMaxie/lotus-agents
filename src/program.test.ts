import { describe, expect, it } from 'vitest';
import { createWriters } from './__tests__/helpers';
import { ProjectCommand } from './commands';
import { buildProgram, runCli } from './program';

describe('program', () => {
  it('exposes the expected command names', () => {
    const writers = createWriters();
    const program = buildProgram({
      cwd: process.cwd(),
      ...writers.context,
    });

    expect(program.commands.map((command) => command.name()).sort()).toEqual([
      ProjectCommand.Doctor,
      ProjectCommand.Install,
      ProjectCommand.Remove,
      ProjectCommand.Update,
      ProjectCommand.Validate,
    ]);
  });

  it('prints package version globally', async () => {
    const writers = createWriters();
    const result = await runCli(['node', 'lotusagents', '--version'], {
      cwd: process.cwd(),
      ...writers.context,
    });

    expect(result.exitCode).toBe(0);
    expect(writers.stdout.join('')).toMatch(/^0\.1\.0/);
  });
});
