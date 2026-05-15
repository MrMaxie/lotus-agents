import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execa } from 'execa';
import { expect } from 'vitest';
import { type ManagedArtifact, ManagedArtifactType, managedArtifacts } from '../manifest';
import { createWorkflowConfig, normalizeTaskSources, renderWorkflowConfig } from '../workflowConfig';

export const createWriters = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    context: {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    },
  };
};

export const createTempDirectory = async (taskId: string): Promise<string> => mkdtemp(join(tmpdir(), `lotusagents-${taskId}-`));

export const createTempRepository = async (taskId: string): Promise<string> => {
  const cwd = await createTempDirectory(taskId);

  await execa('git', ['-c', 'init.defaultBranch=master', 'init'], { cwd });
  return cwd;
};

export const cleanupTempDirectory = async (cwd: string): Promise<void> => {
  await rm(cwd, { recursive: true, force: true });
};

export const createFile = async (cwd: string, path: string, content = ''): Promise<void> => {
  const absolutePath = join(cwd, path);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
};

export const createDirectory = async (cwd: string, path: string): Promise<void> => {
  await mkdir(join(cwd, path), { recursive: true });
};

export const createDirectoryLink = async (cwd: string, path: string, targetPath: string): Promise<void> => {
  const absolutePath = join(cwd, path);

  await mkdir(dirname(absolutePath), { recursive: true });
  await symlink(targetPath, absolutePath, process.platform === 'win32' ? 'junction' : 'dir');
};

export const createFileLink = async (cwd: string, path: string, targetPath: string): Promise<void> => {
  const absolutePath = join(cwd, path);

  await mkdir(dirname(absolutePath), { recursive: true });
  await symlink(targetPath, absolutePath, process.platform === 'win32' ? 'file' : 'file');
};

export const readRepositoryFile = async (cwd: string, path: string): Promise<string> => readFile(join(cwd, path), 'utf8');

export const copyRepositoryFile = async (cwd: string, sourcePath: string, targetPath: string): Promise<void> => {
  const content = await readFile(join(process.cwd(), sourcePath), 'utf8');

  await createFile(cwd, targetPath, content);
};

export const createManagedArtifact = async (
  cwd: string,
  artifact: ManagedArtifact,
  metadataOverrides: Record<string, unknown> = {},
): Promise<void> => {
  const metadata = {
    ...artifact.metadata,
    ...metadataOverrides,
  };

  if (artifact.kind === 'directory') {
    await createDirectory(cwd, artifact.path);
    await writeFile(join(cwd, artifact.path, '.lotus.json'), `${JSON.stringify({ metadata }, null, 2)}\n`);
    return;
  }

  if (artifact.migration.strategy === 'json-manifest') {
    if (artifact.metadata.artifactType === ManagedArtifactType.ProjectWorkflowConfig) {
      await createFile(
        cwd,
        artifact.path,
        renderWorkflowConfig(
          createWorkflowConfig({
            metadata: metadata as ManagedArtifact['metadata'],
            selectedProfiles: metadata.selectedProfiles as ManagedArtifact['metadata']['selectedProfiles'],
            taskSources: normalizeTaskSources(metadata.selectedProfiles as ManagedArtifact['metadata']['selectedProfiles'], [], {}, []),
          }),
        ),
      );
      return;
    }

    await createFile(cwd, artifact.path, `${JSON.stringify({ metadata }, null, 2)}\n`);
    return;
  }

  if (artifact.migration.strategy === 'structured-sections') {
    await createFile(cwd, artifact.path, `# Managed ${artifact.path}\n\nUnrelated local content.\n`);
    return;
  }

  await createFile(
    cwd,
    artifact.path,
    `---\n${JSON.stringify(metadata, null, 2)}\n---\n# Managed ${artifact.path}\n\nUnrelated local content.\n`,
  );
};

export const createManagedArtifacts = async (cwd: string, overridesByPath: Record<string, Record<string, unknown>> = {}): Promise<void> => {
  for (const artifact of managedArtifacts) {
    await createManagedArtifact(cwd, artifact, overridesByPath[artifact.path]);
  }
};

export const expectPathExists = async (cwd: string, path: string): Promise<void> => {
  await expect(access(join(cwd, path))).resolves.toBeUndefined();
};

export const expectPathMissing = async (cwd: string, path: string): Promise<void> => {
  await expect(access(join(cwd, path))).rejects.toThrow();
};
