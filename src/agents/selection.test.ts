import { describe, expect, it } from 'vitest';
import { LotusAgent } from '../manifest';
import { resolveSelectedAgents } from './selection';

const detections = [
  { agent: LotusAgent.Codex, detected: true, reasons: ['repository AGENTS.md'] },
  { agent: LotusAgent.Claude, detected: false, reasons: [] },
  { agent: LotusAgent.Cursor, detected: true, reasons: ['repository .cursor configuration'] },
];

describe('agent selection', () => {
  it('returns no agents when agent artifacts are disabled', async () => {
    await expect(
      resolveSelectedAgents(detections, Object.values(LotusAgent), { cwd: process.cwd(), noAgentArtifacts: true }),
    ).resolves.toEqual([]);
  });

  it('selects detected agents when recommended selection is requested', async () => {
    await expect(
      resolveSelectedAgents(detections, Object.values(LotusAgent), { cwd: process.cwd(), selectRecommendedAgents: true }),
    ).resolves.toEqual([LotusAgent.Codex, LotusAgent.Cursor]);
  });

  it('deduplicates explicit agent selections', async () => {
    await expect(
      resolveSelectedAgents(detections, Object.values(LotusAgent), {
        cwd: process.cwd(),
        selectedAgents: [LotusAgent.Claude, LotusAgent.Claude],
      }),
    ).resolves.toEqual([LotusAgent.Claude]);
  });
});
