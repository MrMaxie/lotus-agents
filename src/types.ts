import { z } from 'zod';

export type OutputWriter = (message: string) => void;

export const workflowActionSchema = z.enum(['update', 'remove', 'cancel']);
export const removeScopeSchema = z.enum(['all', 'local', 'docs']);

export type WorkflowAction = z.infer<typeof workflowActionSchema>;
export type RemoveScope = z.infer<typeof removeScopeSchema>;

export type CommandContext = {
  cwd: string;
  stdout: OutputWriter;
  stderr: OutputWriter;
  isInteractive?: boolean;
  updateAction?: WorkflowAction;
  removeScope?: RemoveScope;
  forceReinstall?: boolean;
};

export type CliResult = {
  exitCode: number;
};

export type RepositoryState = {
  cwd: string;
  root: string | null;
  isRepository: boolean;
};
