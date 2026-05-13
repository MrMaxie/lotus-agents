import { cancel, isCancel, multiselect, select } from '@clack/prompts';
import { z } from 'zod';
import type { AgentDetection } from './agentArtifactTypes';
import { enumValues } from './enumValues';
import { type LotusAgent, lotusAgentSchema } from './manifest';
import type { CommandContext } from './types';

export enum AgentSelectionMode {
  Custom = 'custom',
  Recommended = 'recommended',
  None = 'none',
}

export const agentSelectionModeSchema = z.enum(enumValues(AgentSelectionMode));

export const resolveSelectedAgents = async (detections: AgentDetection[], supportedAgents: LotusAgent[], context: CommandContext) => {
  if (context.noAgentArtifacts === true) {
    return [];
  }

  if (context.selectRecommendedAgents === true) {
    return detections.filter((detection) => detection.detected).map((detection) => detection.agent);
  }

  if (context.selectedAgents !== undefined) {
    return z.array(lotusAgentSchema).parse([...new Set(context.selectedAgents)]);
  }

  const isInteractive = context.isInteractive ?? process.stdin.isTTY;

  if (!isInteractive) {
    return [];
  }

  const mode = await select<AgentSelectionMode>({
    message: 'Choose agent artifact selection.',
    options: [
      { value: AgentSelectionMode.Recommended, label: 'Select recommended', hint: 'Use all detected agents.' },
      { value: AgentSelectionMode.Custom, label: 'Select manually', hint: 'Choose one or more supported agents.' },
      { value: AgentSelectionMode.None, label: 'No agent artifacts', hint: 'Do not generate agent entrypoint files.' },
    ],
  });

  if (isCancel(mode)) {
    cancel('Canceled.');
    return [];
  }

  const parsedMode = agentSelectionModeSchema.parse(mode);

  if (parsedMode === AgentSelectionMode.None) {
    return [];
  }

  if (parsedMode === AgentSelectionMode.Recommended) {
    return detections.filter((detection) => detection.detected).map((detection) => detection.agent);
  }

  const agents = await multiselect<LotusAgent>({
    message: 'Choose agent artifacts to generate.',
    options: supportedAgents.map((agent) => ({ value: agent, label: agent })),
    required: false,
  });

  if (isCancel(agents)) {
    cancel('Canceled.');
    return [];
  }

  return z.array(lotusAgentSchema).parse(agents);
};
