import pc from 'picocolors';
import { formatAgents, formatDetectedAgents } from '../agents';
import { lotusManifest } from '../manifest';
import type { CommandContext } from '../types';
import { formatRemoveScope } from './workflowFormatting';
import type { WorkflowPlan } from './workflowTypes';

export const renderPlanSummary = (plan: WorkflowPlan, context: CommandContext): void => {
  context.stdout(`${pc.bold(plan.title)}\n`);
  context.stdout(`Repository: ${plan.repository.root}\n`);
  context.stdout(`Manifest schema: v${lotusManifest.schemaVersion}\n`);
  context.stdout(`State: ${plan.state.status} (${plan.state.reasonCode})\n`);
  context.stdout(`Detected managed artifacts: ${plan.state.managedPaths.length > 0 ? plan.state.managedPaths.join(', ') : 'none'}\n`);

  if (plan.state.invalidManagedPaths.length > 0) {
    context.stdout(
      `Invalid managed artifact shapes: ${plan.state.invalidManagedPaths
        .map((artifact) => `${artifact.path} (expected ${artifact.expectedKind}, found ${artifact.actualKind})`)
        .join(', ')}\n`,
    );
  }

  if (plan.state.diagnostics.length > 0) {
    context.stdout('Diagnostics:\n');

    for (const diagnostic of plan.state.diagnostics) {
      context.stdout(`- ${diagnostic.path} ${diagnostic.reasonCode}: ${diagnostic.message}\n`);
    }
  }

  if (plan.configuration !== undefined) {
    context.stdout('Installation configuration:\n');
    context.stdout(`- .docs mode: ${plan.configuration.docsMode}\n`);
    context.stdout(
      `- Prefilled from detected .docs artifacts: ${
        plan.configuration.detectedDocsArtifacts.length > 0 ? plan.configuration.detectedDocsArtifacts.join(', ') : 'none'
      }\n`,
    );
    context.stdout(`- Detected agents: ${formatDetectedAgents(plan.configuration.agents.detections)}\n`);
    context.stdout(`- Selected agents: ${formatAgents(plan.configuration.agents.selectedAgents)}\n`);
  }

  if (plan.removeScope !== undefined) {
    context.stdout(`Selected remove scope: ${formatRemoveScope(plan.removeScope)}\n`);
  }

  context.stdout('Planned changes:\n');

  for (const plannedChange of plan.plannedChanges) {
    context.stdout(`- ${plannedChange}\n`);
  }
};

export const renderResultSummary = (plan: WorkflowPlan, appliedChanges: string[], context: CommandContext): void => {
  context.stdout(`${pc.green('Result:')} ${plan.resultMessage}\n`);

  for (const appliedChange of appliedChanges) {
    context.stdout(`- ${appliedChange}\n`);
  }
};
