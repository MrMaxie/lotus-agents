import type { LotusAgent } from '../manifest';
import type { AgentDetection } from './artifactTypes';

export const formatDetectedAgents = (detections: AgentDetection[]) => {
  const detected = detections.filter((detection) => detection.detected);

  return detected.length > 0 ? detected.map((detection) => `${detection.agent} (${detection.reasons.join(', ')})`).join(', ') : 'none';
};

export const formatAgents = (agents: LotusAgent[]) => (agents.length > 0 ? agents.join(', ') : 'none');
