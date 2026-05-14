import { describe, expect, it } from 'vitest';
import {
  cleanupTempDirectory,
  createDirectory,
  createFile,
  createTempDirectory,
  expectPathExists,
  expectPathMissing,
} from './__tests__/helpers';
import { cleanPackageArtifacts } from './packageArtifactCleanup';

describe('package artifact cleanup', () => {
  it('removes generated package artifacts without deleting local state or dependencies', async ({ task }) => {
    const cwd = await createTempDirectory(task.id);

    try {
      await createDirectory(cwd, 'dist');
      await createDirectory(cwd, 'package-smoke');
      await createDirectory(cwd, 'node_modules');
      await createDirectory(cwd, '.local');
      await createDirectory(cwd, 'coverage');
      await createDirectory(cwd, 'nested');
      await createFile(cwd, 'pack-dry-run.json', '[]\n');
      await createFile(cwd, 'maxiedev-lotusagents-1.0.0.tgz', 'tarball');
      await createFile(cwd, 'nested/fixture.tgz', 'keep');

      const removedPaths = await cleanPackageArtifacts(cwd);

      expect(removedPaths.sort()).toEqual(['dist', 'maxiedev-lotusagents-1.0.0.tgz', 'pack-dry-run.json', 'package-smoke']);
      await expectPathMissing(cwd, 'dist');
      await expectPathMissing(cwd, 'package-smoke');
      await expectPathMissing(cwd, 'pack-dry-run.json');
      await expectPathMissing(cwd, 'maxiedev-lotusagents-1.0.0.tgz');
      await expectPathExists(cwd, 'node_modules');
      await expectPathExists(cwd, '.local');
      await expectPathExists(cwd, 'coverage');
      await expectPathExists(cwd, 'nested/fixture.tgz');
    } finally {
      await cleanupTempDirectory(cwd);
    }
  });
});
