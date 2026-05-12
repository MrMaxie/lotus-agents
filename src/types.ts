export type OutputWriter = (message: string) => void;

export type WorkflowAction = 'update' | 'remove' | 'cancel';

export type CommandContext = {
  cwd: string;
  stdout: OutputWriter;
  stderr: OutputWriter;
  isInteractive?: boolean;
  updateAction?: WorkflowAction;
};

export type CliResult = {
  exitCode: number;
};

export type RepositoryState = {
  cwd: string;
  root: string | null;
  isRepository: boolean;
};
