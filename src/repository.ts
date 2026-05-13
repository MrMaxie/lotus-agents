import { execa } from 'execa';
import type { RepositoryState } from './types';

export const detectRepository = async (cwd: string): Promise<RepositoryState> => {
  try {
    const result = await execa('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      reject: true,
    });

    return {
      cwd,
      root: result.stdout.trim(),
      isRepository: true,
    };
  } catch {
    return {
      cwd,
      root: null,
      isRepository: false,
    };
  }
};
