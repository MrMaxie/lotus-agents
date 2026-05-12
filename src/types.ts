export type OutputWriter = (message: string) => void;

export type WorkflowAction = 'update' | 'remove' | 'cancel';
export type RemoveScope = 'all' | 'local' | 'docs';

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
