import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

const managedPathOperationVerbs = {
  remove: 'remove',
  write: 'write',
} as const;

export type ManagedPathOperation = keyof typeof managedPathOperationVerbs;

export class ManagedPathSafetyError extends Error {
  readonly managedPath: string;
  readonly unsafePath: string;
  readonly operation: ManagedPathOperation;

  constructor(managedPath: string, unsafePath: string, operation: ManagedPathOperation) {
    const action = managedPathOperationVerbs[operation];
    super(`Refusing to ${action} ${managedPath}: ${unsafePath} resolves outside the repository. No files were changed.`);
    this.name = 'ManagedPathSafetyError';
    this.managedPath = managedPath;
    this.unsafePath = unsafePath;
    this.operation = operation;
  }
}

const splitManagedPath = (managedPath: string): string[] => {
  return normalize(managedPath)
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== '.');
};

const isMissingPathError = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'ENOENT';

const isPathInsideRoot = (root: string, target: string): boolean => {
  const relativePath = relative(root, target);

  return relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath));
};

const assertPathInsideRoot = (
  repositoryRoot: string,
  candidatePath: string,
  managedPath: string,
  inspectedPath: string,
  operation: ManagedPathOperation,
): void => {
  if (!isPathInsideRoot(repositoryRoot, candidatePath)) {
    throw new ManagedPathSafetyError(managedPath, inspectedPath, operation);
  }
};

export const resolveSafeManagedPath = async (
  repositoryRoot: string,
  managedPath: string,
  operation: ManagedPathOperation,
): Promise<string> => {
  const logicalRoot = resolve(repositoryRoot);
  const canonicalRoot = await realpath(logicalRoot);
  const segments = splitManagedPath(managedPath);
  let logicalCurrent = logicalRoot;
  let canonicalCurrent = canonicalRoot;

  for (const [index, segment] of segments.entries()) {
    logicalCurrent = join(logicalCurrent, segment);
    const inspectedPath = segments.slice(0, index + 1).join('/');
    const stats = await lstat(logicalCurrent).catch((error: unknown) => {
      if (isMissingPathError(error)) {
        return null;
      }

      throw error;
    });

    if (stats === null) {
      const unresolvedTarget = join(canonicalCurrent, ...segments.slice(index));

      assertPathInsideRoot(canonicalRoot, unresolvedTarget, managedPath, inspectedPath, operation);
      return unresolvedTarget;
    }

    const resolvedCurrent = await realpath(logicalCurrent);

    assertPathInsideRoot(canonicalRoot, resolvedCurrent, managedPath, inspectedPath, operation);
    canonicalCurrent = resolvedCurrent;
  }

  return canonicalCurrent;
};

export const resolveSafeManagedPaths = async (
  repositoryRoot: string,
  managedPaths: string[],
  operation: ManagedPathOperation,
): Promise<Map<string, string>> => {
  const resolutions = new Map<string, string>();

  for (const managedPath of managedPaths) {
    if (resolutions.has(managedPath)) {
      continue;
    }

    resolutions.set(managedPath, await resolveSafeManagedPath(repositoryRoot, managedPath, operation));
  }

  return resolutions;
};
