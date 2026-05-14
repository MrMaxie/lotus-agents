import { z } from 'zod';
import { enumValues } from './enumValues';
import type { LotusAgent, LotusProfile } from './manifest';
import type { SourceOfTruthMode, TaskSource } from './workflowConfig';

export type OutputWriter = (message: string) => void;

export enum WorkflowAction {
  Update = 'update',
  Remove = 'remove',
  Cancel = 'cancel',
}

export enum RemoveScope {
  All = 'all',
  Local = 'local',
  Docs = 'docs',
}

export const workflowActionSchema = z.enum(enumValues(WorkflowAction));
export const removeScopeSchema = z.enum(enumValues(RemoveScope));

export type CommandContext = {
  cwd: string;
  stdout: OutputWriter;
  stderr: OutputWriter;
  isInteractive?: boolean;
  updateAction?: WorkflowAction;
  removeScope?: RemoveScope;
  forceReinstall?: boolean;
  selectedAgents?: LotusAgent[];
  selectRecommendedAgents?: boolean;
  noAgentArtifacts?: boolean;
  selectedProfiles?: LotusProfile[];
  selectedTaskSources?: TaskSource[];
  taskSourceModes?: Partial<Record<TaskSource, SourceOfTruthMode>>;
  writeEnabledTaskSources?: TaskSource[];
};

export type CliResult = {
  exitCode: number;
};

export type RepositoryState = {
  cwd: string;
  root: string | null;
  isRepository: boolean;
};
