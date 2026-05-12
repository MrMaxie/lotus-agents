export type OutputWriter = (message: string) => void;

export interface CommandContext {
  cwd: string;
  stdout: OutputWriter;
  stderr: OutputWriter;
}

export interface CliResult {
  exitCode: number;
}

export interface RepositoryState {
  cwd: string;
  root: string | null;
  isRepository: boolean;
}
