import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  lotusAgentSchema,
  lotusArtifactContentVersion,
  lotusArtifactSchemaVersion,
  lotusProfileSchema,
  type ManagedArtifact,
  managedArtifactScopeSchema,
  managedArtifacts,
  managedArtifactTypeSchema,
  managedContentClassSchema,
  managedPrivacySchema,
} from './manifest.js';
import type { RepositoryState } from './types.js';

export type LotusStateStatus = 'missing' | 'valid' | 'outdated' | 'partially-installed' | 'damaged-lotus-artifact' | 'external-corruption';

export type LotusValidationReasonCode =
  | 'managed-artifacts-missing'
  | 'managed-artifacts-valid'
  | 'managed-artifacts-outdated'
  | 'managed-artifacts-partial'
  | 'artifact-kind-mismatch'
  | 'artifact-metadata-missing'
  | 'artifact-metadata-invalid'
  | 'external-config-invalid';

export type ArtifactKindMismatch = {
  path: string;
  expectedKind: 'file' | 'directory';
  actualKind: 'file' | 'directory';
};

export type LotusStateDiagnostic = {
  path: string;
  reasonCode: LotusValidationReasonCode;
  message: string;
};

export type LotusArtifactState = {
  path: string;
  status: Exclude<LotusStateStatus, 'external-corruption' | 'partially-installed'>;
  diagnostics: LotusStateDiagnostic[];
  kindMismatch?: ArtifactKindMismatch;
};

export type LotusState = {
  status: LotusStateStatus;
  reasonCode: LotusValidationReasonCode;
  message: string;
  hasManagedState: boolean;
  managedPaths: string[];
  invalidManagedPaths: ArtifactKindMismatch[];
  missingManagedPaths: string[];
  diagnostics: LotusStateDiagnostic[];
  artifacts: LotusArtifactState[];
};

const directoryManifestFileName = '.lotus.json';

const looseArtifactMetadataSchema = z.object({
  lotus: z.literal('managed-artifact'),
  scope: managedArtifactScopeSchema,
  artifactType: managedArtifactTypeSchema,
  schemaVersion: z.number().int().positive(),
  contentVersion: z.string().min(1),
  privacy: managedPrivacySchema,
  contentClass: managedContentClassSchema,
  selectedProfiles: z.array(lotusProfileSchema),
  selectedAgents: z.array(lotusAgentSchema),
  selectedProcedures: z.array(z.string().min(1)),
});

type LooseArtifactMetadata = z.infer<typeof looseArtifactMetadataSchema>;

export async function detectLotusState(repository: RepositoryState): Promise<LotusState> {
  const root = repository.root;

  if (root === null) {
    return createMissingState([]);
  }

  const artifactStates = await Promise.all(managedArtifacts.map((artifact) => validateManagedArtifact(root, artifact)));
  const externalDiagnostics = await validateExternalConfiguration(root);
  const presentArtifacts = artifactStates.filter((artifact) => artifact.status !== 'missing' && artifact.kindMismatch === undefined);
  const managedPaths = presentArtifacts.map((artifact) => artifact.path);
  const invalidManagedPaths = artifactStates.flatMap((artifact) => (artifact.kindMismatch === undefined ? [] : [artifact.kindMismatch]));
  const missingManagedPaths = artifactStates.flatMap((artifact) => (artifact.status === 'missing' ? [artifact.path] : []));
  const diagnostics = [...artifactStates.flatMap((artifact) => artifact.diagnostics), ...externalDiagnostics];

  return summarizeState({
    artifactStates,
    diagnostics,
    externalDiagnostics,
    invalidManagedPaths,
    managedPaths,
    missingManagedPaths,
  });
}

async function validateManagedArtifact(root: string, artifact: ManagedArtifact): Promise<LotusArtifactState> {
  const absolutePath = join(root, artifact.path);

  try {
    const stats = await lstat(absolutePath);
    const actualKind: 'directory' | 'file' = stats.isDirectory() ? 'directory' : 'file';

    if (actualKind !== artifact.kind) {
      const kindMismatch = {
        path: artifact.path,
        expectedKind: artifact.kind,
        actualKind,
      };

      return {
        path: artifact.path,
        status: 'damaged-lotus-artifact',
        kindMismatch,
        diagnostics: [
          {
            path: artifact.path,
            reasonCode: 'artifact-kind-mismatch',
            message: `Expected ${artifact.path} to be a ${artifact.kind}, but found a ${actualKind}.`,
          },
        ],
      };
    }

    const metadataResult = artifact.kind === 'directory' ? await readDirectoryMetadata(absolutePath) : await readFileMetadata(absolutePath);

    if (metadataResult.status === 'missing') {
      return {
        path: artifact.path,
        status: 'damaged-lotus-artifact',
        diagnostics: [
          {
            path: artifact.path,
            reasonCode: 'artifact-metadata-missing',
            message: `Missing Lotus metadata for ${artifact.path}.`,
          },
        ],
      };
    }

    if (metadataResult.status === 'invalid') {
      return {
        path: artifact.path,
        status: 'damaged-lotus-artifact',
        diagnostics: [
          {
            path: artifact.path,
            reasonCode: 'artifact-metadata-invalid',
            message: metadataResult.message,
          },
        ],
      };
    }

    return validateArtifactMetadata(artifact, metadataResult.metadata);
  } catch (error) {
    if (isMissingPathError(error)) {
      return {
        path: artifact.path,
        status: 'missing',
        diagnostics: [],
      };
    }

    return {
      path: artifact.path,
      status: 'damaged-lotus-artifact',
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: 'artifact-metadata-invalid',
          message: `Could not inspect ${artifact.path}.`,
        },
      ],
    };
  }
}

async function readFileMetadata(absolutePath: string): Promise<MetadataReadResult> {
  const content = await readFile(absolutePath, 'utf8');
  const frontmatter = extractFrontmatter(content);

  if (frontmatter === null) {
    return { status: 'missing' };
  }

  try {
    return {
      status: 'present',
      metadata: parseYaml(frontmatter),
    };
  } catch (error) {
    return {
      status: 'invalid',
      message: `Invalid Lotus metadata frontmatter: ${formatParserError(error)}.`,
    };
  }
}

async function readDirectoryMetadata(absolutePath: string): Promise<MetadataReadResult> {
  const manifestPath = join(absolutePath, directoryManifestFileName);

  try {
    const content = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(content) as unknown;

    return {
      status: 'present',
      metadata: unwrapDirectoryMetadata(parsed),
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return { status: 'missing' };
    }

    return {
      status: 'invalid',
      message: `Invalid Lotus directory manifest ${directoryManifestFileName}: ${formatParserError(error)}.`,
    };
  }
}

function validateArtifactMetadata(artifact: ManagedArtifact, rawMetadata: unknown): LotusArtifactState {
  const parsed = looseArtifactMetadataSchema.safeParse(rawMetadata);

  if (!parsed.success) {
    return {
      path: artifact.path,
      status: 'damaged-lotus-artifact',
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: 'artifact-metadata-invalid',
          message: `Invalid Lotus metadata for ${artifact.path}: ${z.prettifyError(parsed.error)}.`,
        },
      ],
    };
  }

  const metadata = parsed.data;
  const mismatch = getArtifactMetadataMismatch(artifact, metadata);

  if (mismatch !== null) {
    return {
      path: artifact.path,
      status: 'damaged-lotus-artifact',
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: 'artifact-metadata-invalid',
          message: mismatch,
        },
      ],
    };
  }

  if (metadata.schemaVersion !== lotusArtifactSchemaVersion || metadata.contentVersion !== lotusArtifactContentVersion) {
    return {
      path: artifact.path,
      status: 'outdated',
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: 'managed-artifacts-outdated',
          message: `${artifact.path} uses Lotus metadata v${metadata.schemaVersion} and content ${metadata.contentVersion}; expected v${lotusArtifactSchemaVersion} and content ${lotusArtifactContentVersion}.`,
        },
      ],
    };
  }

  return {
    path: artifact.path,
    status: 'valid',
    diagnostics: [],
  };
}

async function validateExternalConfiguration(root: string): Promise<LotusStateDiagnostic[]> {
  const codexConfigPath = join(root, '.codex', 'config.toml');

  try {
    const content = await readFile(codexConfigPath, 'utf8');

    parseToml(content);
    return [];
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }

    return [
      {
        path: '.codex/config.toml',
        reasonCode: 'external-config-invalid',
        message: `External Codex configuration is not valid TOML and is outside Lotus repair scope: ${formatParserError(error)}.`,
      },
    ];
  }
}

function summarizeState(input: {
  artifactStates: LotusArtifactState[];
  diagnostics: LotusStateDiagnostic[];
  externalDiagnostics: LotusStateDiagnostic[];
  invalidManagedPaths: ArtifactKindMismatch[];
  managedPaths: string[];
  missingManagedPaths: string[];
}): LotusState {
  const { artifactStates, diagnostics, externalDiagnostics, invalidManagedPaths, managedPaths, missingManagedPaths } = input;

  if (externalDiagnostics.length > 0) {
    return createState('external-corruption', 'external-config-invalid', 'External configuration is broken outside Lotus scope.', input);
  }

  if (artifactStates.some((artifact) => artifact.status === 'damaged-lotus-artifact')) {
    const damagedDiagnostic = diagnostics.find((diagnostic) =>
      ['artifact-kind-mismatch', 'artifact-metadata-missing', 'artifact-metadata-invalid'].includes(diagnostic.reasonCode),
    );

    return createState(
      'damaged-lotus-artifact',
      damagedDiagnostic?.reasonCode ?? 'artifact-metadata-invalid',
      'One or more Lotus-managed artifacts are damaged.',
      input,
    );
  }

  if (artifactStates.some((artifact) => artifact.status === 'outdated')) {
    return createState('outdated', 'managed-artifacts-outdated', 'One or more Lotus-managed artifacts are outdated.', input);
  }

  if (managedPaths.length === 0) {
    return createMissingState(diagnostics);
  }

  if (missingManagedPaths.length > 0) {
    return createState('partially-installed', 'managed-artifacts-partial', 'Some Lotus-managed artifacts are missing.', input);
  }

  return {
    status: 'valid',
    reasonCode: 'managed-artifacts-valid',
    message: 'All Lotus-managed artifacts are present and current.',
    hasManagedState: true,
    managedPaths,
    invalidManagedPaths,
    missingManagedPaths,
    diagnostics,
    artifacts: artifactStates,
  };
}

function createState(
  status: LotusStateStatus,
  reasonCode: LotusValidationReasonCode,
  message: string,
  input: {
    artifactStates: LotusArtifactState[];
    diagnostics: LotusStateDiagnostic[];
    invalidManagedPaths: ArtifactKindMismatch[];
    managedPaths: string[];
    missingManagedPaths: string[];
  },
): LotusState {
  return {
    status,
    reasonCode,
    message,
    hasManagedState: input.managedPaths.length > 0 || input.invalidManagedPaths.length > 0,
    managedPaths: input.managedPaths,
    invalidManagedPaths: input.invalidManagedPaths,
    missingManagedPaths: input.missingManagedPaths,
    diagnostics: input.diagnostics,
    artifacts: input.artifactStates,
  };
}

function createMissingState(diagnostics: LotusStateDiagnostic[]): LotusState {
  return {
    status: 'missing',
    reasonCode: 'managed-artifacts-missing',
    message: 'No Lotus-managed artifacts were found.',
    hasManagedState: false,
    managedPaths: [],
    invalidManagedPaths: [],
    missingManagedPaths: managedArtifacts.map((artifact) => artifact.path),
    diagnostics,
    artifacts: managedArtifacts.map((artifact) => ({
      path: artifact.path,
      status: 'missing',
      diagnostics: [],
    })),
  };
}

function getArtifactMetadataMismatch(artifact: ManagedArtifact, metadata: LooseArtifactMetadata): string | null {
  if (metadata.scope !== artifact.scope) {
    return `Lotus metadata scope mismatch for ${artifact.path}: expected ${artifact.scope}, found ${metadata.scope}.`;
  }

  if (metadata.artifactType !== artifact.metadata.artifactType) {
    return `Lotus metadata artifact type mismatch for ${artifact.path}: expected ${artifact.metadata.artifactType}, found ${metadata.artifactType}.`;
  }

  if (metadata.privacy !== artifact.metadata.privacy) {
    return `Lotus metadata privacy mismatch for ${artifact.path}: expected ${artifact.metadata.privacy}, found ${metadata.privacy}.`;
  }

  if (metadata.contentClass !== artifact.metadata.contentClass) {
    return `Lotus metadata content class mismatch for ${artifact.path}: expected ${artifact.metadata.contentClass}, found ${metadata.contentClass}.`;
  }

  return null;
}

function extractFrontmatter(content: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  return match?.[1] ?? null;
}

function unwrapDirectoryMetadata(parsed: unknown): unknown {
  if (parsed !== null && typeof parsed === 'object' && 'metadata' in parsed) {
    return (parsed as { metadata: unknown }).metadata;
  }

  return parsed;
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function formatParserError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown parser error';
}

type MetadataReadResult = { status: 'missing' } | { status: 'invalid'; message: string } | { status: 'present'; metadata: unknown };
