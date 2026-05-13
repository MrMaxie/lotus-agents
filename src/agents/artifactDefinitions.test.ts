import { describe, expect, it } from 'vitest';
import { LotusAgent } from '../manifest';
import { AgentArtifactKind } from './adapters';
import { agentArtifactDefinitions, selectAgentArtifacts } from './artifactDefinitions';

describe('agent artifact definitions', () => {
  it('coalesces agents that share the same artifact target', () => {
    expect(agentArtifactDefinitions.find((definition) => definition.path === 'AGENTS.md')).toMatchObject({
      kind: AgentArtifactKind.SharedAgents,
      agents: [LotusAgent.Codex, LotusAgent.Opencode],
    });
  });

  it('selects only artifacts required by selected agents', () => {
    expect(selectAgentArtifacts([LotusAgent.Codex, LotusAgent.Cursor]).map((artifact) => [artifact.path, artifact.selectedAgents])).toEqual(
      [
        ['AGENTS.md', [LotusAgent.Codex]],
        ['.cursor/rules/lotus.mdc', [LotusAgent.Cursor]],
      ],
    );
  });
});
