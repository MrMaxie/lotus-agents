import { describe, expect, it } from 'vitest';
import { LotusAgent } from '../manifest';
import { formatAgents, formatDetectedAgents } from './formatting';

describe('agent formatting', () => {
  it('formats selected agent lists for terminal output', () => {
    expect(formatAgents([])).toBe('none');
    expect(formatAgents([LotusAgent.Codex, LotusAgent.Claude])).toBe('codex, claude');
  });

  it('formats detected agents with detection reasons', () => {
    expect(
      formatDetectedAgents([
        { agent: LotusAgent.Codex, detected: true, reasons: ['repository AGENTS.md'] },
        { agent: LotusAgent.Cursor, detected: false, reasons: [] },
      ]),
    ).toBe('codex (repository AGENTS.md)');
  });
});
