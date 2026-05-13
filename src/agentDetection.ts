import { join } from 'node:path';
import { agentAdapters } from './agentAdapters';
import { pathExists } from './utils/pathExists';

export const detectAgents = async (root: string) =>
  Promise.all(
    agentAdapters.map(async (adapter) => {
      const detectionChecks = adapter.hooks.detect({ agent: adapter.agent });
      const checks = await Promise.all(
        detectionChecks.map(async (check) => ({
          reason: check.reason,
          exists: await pathExists(join(root, check.path)),
        })),
      );

      return {
        agent: adapter.agent,
        reasons: checks.filter((check) => check.exists).map((check) => check.reason),
        detected: checks.some((check) => check.exists),
      };
    }),
  );
