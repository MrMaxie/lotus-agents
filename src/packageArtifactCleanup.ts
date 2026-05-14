import { lstat, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const generatedPackageArtifactPaths = ['dist', 'package-smoke', 'pack-dry-run.json'];

const pathExists = async (path: string): Promise<boolean> => {
  const stats = await lstat(path).catch((error: unknown) => {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  });

  return stats !== null;
};

export const cleanPackageArtifacts = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const rootTarballs = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.tgz')).map((entry) => entry.name);
  const artifactPaths = [...generatedPackageArtifactPaths, ...rootTarballs];
  const removedPaths = await Promise.all(
    artifactPaths.map(async (artifactPath) => {
      const absolutePath = join(root, artifactPath);
      const exists = await pathExists(absolutePath);

      await rm(absolutePath, { force: true, recursive: true });

      return exists ? artifactPath : null;
    }),
  );

  return removedPaths.filter((path) => path !== null);
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};
