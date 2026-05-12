export type OutputWriter = (message: string) => void;

export type CommandContext = {
  cwd: string;
  stdout: OutputWriter;
  stderr: OutputWriter;
};

export type CliResult = {
  exitCode: number;
};

export type RepositoryState = {
  cwd: string;
  root: string | null;
  isRepository: boolean;
};
