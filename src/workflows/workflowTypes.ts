import type { AgentConfiguration } from '../agents';
import type { LotusAgent, LotusProfile, ManagedArtifact } from '../manifest';
import type { DocsMode, ProjectCommand } from '../projectCommands';
import type { LotusState } from '../state';
import type { RemoveScope, RepositoryState } from '../types';
import type { TaskSourceSelection, WorkflowConfig } from '../workflowConfig';

export enum WorkflowMode {
  FreshInstall = 'fresh-install',
  DetectedUpdate = 'detected-update',
  ExplicitUpdate = 'explicit-update',
  RepairGuidance = 'repair-guidance',
  ForceReinstall = 'force-reinstall',
  Remove = 'remove',
  Cancel = 'cancel',
  Diagnose = 'diagnose',
  Blocked = 'blocked',
}

export type InstallationConfiguration = {
  docsMode: DocsMode;
  detectedDocsArtifacts: string[];
  selectedProfiles: LotusProfile[];
  prefilledProfiles: LotusProfile[];
  taskSources: TaskSourceSelection[];
  workflowConfig: WorkflowConfig;
  agents: AgentConfiguration;
};

export type WorkflowPlan = {
  command: ProjectCommand;
  mode: WorkflowMode;
  title: string;
  plannedChanges: string[];
  resultMessage: string;
  state: LotusState;
  repository: RepositoryState;
  configuration?: InstallationConfiguration;
  removeScope?: RemoveScope;
  selectedManagedPaths?: string[];
  forceReinstallArtifacts?: ManagedArtifact[];
  selectedAgentsForRemoval?: LotusAgent[];
  shouldRemoveAgentArtifacts?: boolean;
};
