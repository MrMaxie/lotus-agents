import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { match } from 'ts-pattern';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { enumValues } from './enumValues';
import {
  lotusAgentSchema,
  lotusArtifactContentVersion,
  lotusArtifactSchemaVersion,
  lotusProfileSchema,
  type ManagedArtifact,
  ManagedArtifactKind,
  managedArtifactKindSchema,
  managedArtifactScopeSchema,
  managedArtifacts,
  managedArtifactTypeSchema,
  managedContentClassSchema,
  managedPrivacySchema,
} from './manifest';
import type { RepositoryState } from './types';

export enum LotusStateStatus {
  Missing = 'missing',
  Valid = 'valid',
  Outdated = 'outdated',
  PartiallyInstalled = 'partially-installed',
  DamagedLotusArtifact = 'damaged-lotus-artifact',
  ExternalCorruption = 'external-corruption',
}

export enum LotusValidationReasonCode {
  ManagedArtifactsMissing = 'managed-artifacts-missing',
  ManagedArtifactsValid = 'managed-artifacts-valid',
  ManagedArtifactsOutdated = 'managed-artifacts-outdated',
  ManagedArtifactsPartial = 'managed-artifacts-partial',
  ArtifactKindMismatch = 'artifact-kind-mismatch',
  ArtifactMetadataMissing = 'artifact-metadata-missing',
  ArtifactMetadataInvalid = 'artifact-metadata-invalid',
  ExternalConfigInvalid = 'external-config-invalid',
}

export const lotusStateStatusSchema = z.enum(enumValues(LotusStateStatus));
export const lotusValidationReasonCodeSchema = z.enum(enumValues(LotusValidationReasonCode));

enum MetadataReadStatus {
  Missing = 'missing',
  Invalid = 'invalid',
  NotRequired = 'not-required',
  Present = 'present',
}

export type ArtifactKindMismatch = {
  path: string;
  expectedKind: ManagedArtifactKind;
  actualKind: ManagedArtifactKind;
};

export type LotusStateDiagnostic = {
  path: string;
  reasonCode: LotusValidationReasonCode;
  message: string;
};

export type LotusArtifactState = {
  path: string;
  status: Exclude<LotusStateStatus, LotusStateStatus.ExternalCorruption | LotusStateStatus.PartiallyInstalled>;
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

export const detectLotusState = async (repository: RepositoryState): Promise<LotusState> => {
  const root = repository.root;

  if (root === null) {
    return createMissingState([]);
  }

  const artifactStates = await Promise.all(managedArtifacts.map((artifact) => validateManagedArtifact(root, artifact)));
  const externalDiagnostics = await validateExternalConfiguration(root);
  const presentArtifacts = artifactStates.filter(
    (artifact) => artifact.status !== LotusStateStatus.Missing && artifact.kindMismatch === undefined,
  );
  const managedPaths = presentArtifacts.map((artifact) => artifact.path);
  const invalidManagedPaths = artifactStates.flatMap((artifact) => (artifact.kindMismatch === undefined ? [] : [artifact.kindMismatch]));
  const missingManagedPaths = artifactStates.flatMap((artifact) => (artifact.status === LotusStateStatus.Missing ? [artifact.path] : []));
  const diagnostics = [...artifactStates.flatMap((artifact) => artifact.diagnostics), ...externalDiagnostics];

  return summarizeState({
    artifactStates,
    diagnostics,
    externalDiagnostics,
    invalidManagedPaths,
    managedPaths,
    missingManagedPaths,
  });
};

const validateManagedArtifact = async (root: string, artifact: ManagedArtifact): Promise<LotusArtifactState> => {
  const absolutePath = join(root, artifact.path);

  try {
    const stats = await lstat(absolutePath);
    const actualKind = managedArtifactKindSchema.parse(stats.isDirectory() ? ManagedArtifactKind.Directory : ManagedArtifactKind.File);

    if (actualKind !== artifact.kind) {
      const kindMismatch = {
        path: artifact.path,
        expectedKind: artifact.kind,
        actualKind,
      };

      return {
        path: artifact.path,
        status: LotusStateStatus.DamagedLotusArtifact,
        kindMismatch,
        diagnostics: [
          {
            path: artifact.path,
            reasonCode: LotusValidationReasonCode.ArtifactKindMismatch,
            message: `Expected ${artifact.path} to be a ${artifact.kind}, but found a ${actualKind}.`,
          },
        ],
      };
    }

    const metadataResult = await readArtifactMetadata(absolutePath, artifact);

    if (metadataResult.status === MetadataReadStatus.NotRequired) {
      return {
        path: artifact.path,
        status: LotusStateStatus.Valid,
        diagnostics: [],
      };
    }

    if (metadataResult.status === MetadataReadStatus.Missing) {
      return {
        path: artifact.path,
        status: LotusStateStatus.Outdated,
        diagnostics: [
          {
            path: artifact.path,
            reasonCode: LotusValidationReasonCode.ArtifactMetadataMissing,
            message: `Missing Lotus metadata for ${artifact.path}; this legacy artifact needs current Lotus metadata.`,
          },
        ],
      };
    }

    if (metadataResult.status === MetadataReadStatus.Invalid) {
      return {
        path: artifact.path,
        status: LotusStateStatus.DamagedLotusArtifact,
        diagnostics: [
          {
            path: artifact.path,
            reasonCode: LotusValidationReasonCode.ArtifactMetadataInvalid,
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
        status: LotusStateStatus.Missing,
        diagnostics: [],
      };
    }

    return {
      path: artifact.path,
      status: LotusStateStatus.DamagedLotusArtifact,
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: LotusValidationReasonCode.ArtifactMetadataInvalid,
          message: `Could not inspect ${artifact.path}.`,
        },
      ],
    };
  }
};

const readArtifactMetadata = async (absolutePath: string, artifact: ManagedArtifact): Promise<MetadataReadResult> => {
  if (artifact.migration.strategy === 'frontmatter') {
    return readFileMetadata(absolutePath);
  }

  if (artifact.migration.strategy === 'directory-manifest') {
    return readDirectoryMetadata(absolutePath);
  }

  return { status: MetadataReadStatus.NotRequired };
};

const readFileMetadata = async (absolutePath: string): Promise<MetadataReadResult> => {
  const content = await readFile(absolutePath, 'utf8');
  const frontmatter = extractFrontmatter(content);

  if (frontmatter === null) {
    return { status: MetadataReadStatus.Missing };
  }

  try {
    return {
      status: MetadataReadStatus.Present,
      metadata: parseYaml(frontmatter),
    };
  } catch (error) {
    return {
      status: MetadataReadStatus.Invalid,
      message: `Invalid Lotus metadata frontmatter: ${formatParserError(error)}.`,
    };
  }
};

const readDirectoryMetadata = async (absolutePath: string): Promise<MetadataReadResult> => {
  const manifestPath = join(absolutePath, directoryManifestFileName);

  try {
    const content = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(content) as unknown;

    return {
      status: MetadataReadStatus.Present,
      metadata: unwrapDirectoryMetadata(parsed),
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return { status: MetadataReadStatus.Missing };
    }

    return {
      status: MetadataReadStatus.Invalid,
      message: `Invalid Lotus directory manifest ${directoryManifestFileName}: ${formatParserError(error)}.`,
    };
  }
};

const validateArtifactMetadata = (artifact: ManagedArtifact, rawMetadata: unknown): LotusArtifactState => {
  const parsed = looseArtifactMetadataSchema.safeParse(rawMetadata);

  if (!parsed.success) {
    return {
      path: artifact.path,
      status: LotusStateStatus.DamagedLotusArtifact,
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: LotusValidationReasonCode.ArtifactMetadataInvalid,
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
      status: LotusStateStatus.DamagedLotusArtifact,
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: LotusValidationReasonCode.ArtifactMetadataInvalid,
          message: mismatch,
        },
      ],
    };
  }

  if (metadata.schemaVersion !== lotusArtifactSchemaVersion || metadata.contentVersion !== lotusArtifactContentVersion) {
    return {
      path: artifact.path,
      status: LotusStateStatus.Outdated,
      diagnostics: [
        {
          path: artifact.path,
          reasonCode: LotusValidationReasonCode.ManagedArtifactsOutdated,
          message: `${artifact.path} uses Lotus metadata v${metadata.schemaVersion} and content ${metadata.contentVersion}; expected v${lotusArtifactSchemaVersion} and content ${lotusArtifactContentVersion}.`,
        },
      ],
    };
  }

  return {
    path: artifact.path,
    status: LotusStateStatus.Valid,
    diagnostics: [],
  };
};

const validateExternalConfiguration = async (root: string): Promise<LotusStateDiagnostic[]> => {
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
        reasonCode: LotusValidationReasonCode.ExternalConfigInvalid,
        message: `External Codex configuration is not valid TOML and is outside Lotus repair scope: ${formatParserError(error)}.`,
      },
    ];
  }
};

const summarizeState = (input: {
  artifactStates: LotusArtifactState[];
  diagnostics: LotusStateDiagnostic[];
  externalDiagnostics: LotusStateDiagnostic[];
  invalidManagedPaths: ArtifactKindMismatch[];
  managedPaths: string[];
  missingManagedPaths: string[];
}): LotusState => {
  const { artifactStates, diagnostics, externalDiagnostics, invalidManagedPaths, managedPaths, missingManagedPaths } = input;

  if (externalDiagnostics.length > 0) {
    return createState(
      LotusStateStatus.ExternalCorruption,
      LotusValidationReasonCode.ExternalConfigInvalid,
      'External configuration is broken outside Lotus scope.',
      input,
    );
  }

  if (artifactStates.some((artifact) => artifact.status === LotusStateStatus.DamagedLotusArtifact)) {
    const damagedDiagnostics = artifactStates
      .filter((artifact) => artifact.status === LotusStateStatus.DamagedLotusArtifact)
      .flatMap((artifact) => artifact.diagnostics);
    const damagedDiagnostic = damagedDiagnostics.find((diagnostic) =>
      match(diagnostic.reasonCode)
        .with(
          LotusValidationReasonCode.ArtifactKindMismatch,
          LotusValidationReasonCode.ArtifactMetadataMissing,
          LotusValidationReasonCode.ArtifactMetadataInvalid,
          () => true,
        )
        .otherwise(() => false),
    );

    return createState(
      LotusStateStatus.DamagedLotusArtifact,
      damagedDiagnostic?.reasonCode ?? LotusValidationReasonCode.ArtifactMetadataInvalid,
      'One or more Lotus-managed artifacts are damaged.',
      input,
    );
  }

  if (artifactStates.some((artifact) => artifact.status === LotusStateStatus.Outdated)) {
    return createState(
      LotusStateStatus.Outdated,
      LotusValidationReasonCode.ManagedArtifactsOutdated,
      'One or more Lotus-managed artifacts are outdated.',
      input,
    );
  }

  if (managedPaths.length === 0) {
    return createMissingState(diagnostics);
  }

  if (missingManagedPaths.length > 0) {
    return createState(
      LotusStateStatus.PartiallyInstalled,
      LotusValidationReasonCode.ManagedArtifactsPartial,
      'Some Lotus-managed artifacts are missing.',
      input,
    );
  }

  return {
    status: LotusStateStatus.Valid,
    reasonCode: LotusValidationReasonCode.ManagedArtifactsValid,
    message: 'All Lotus-managed artifacts are present and current.',
    hasManagedState: true,
    managedPaths,
    invalidManagedPaths,
    missingManagedPaths,
    diagnostics,
    artifacts: artifactStates,
  };
};

const createState = (
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
): LotusState => {
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
};

const createMissingState = (diagnostics: LotusStateDiagnostic[]): LotusState => {
  return {
    status: LotusStateStatus.Missing,
    reasonCode: LotusValidationReasonCode.ManagedArtifactsMissing,
    message: 'No Lotus-managed artifacts were found.',
    hasManagedState: false,
    managedPaths: [],
    invalidManagedPaths: [],
    missingManagedPaths: managedArtifacts.map((artifact) => artifact.path),
    diagnostics,
    artifacts: managedArtifacts.map((artifact) => ({
      path: artifact.path,
      status: LotusStateStatus.Missing,
      diagnostics: [],
    })),
  };
};

const getArtifactMetadataMismatch = (artifact: ManagedArtifact, metadata: LooseArtifactMetadata): string | null => {
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
};

const extractFrontmatter = (content: string): string | null => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  return match?.[1] ?? null;
};

const unwrapDirectoryMetadata = (parsed: unknown): unknown => {
  if (parsed !== null && typeof parsed === 'object' && 'metadata' in parsed) {
    return (parsed as { metadata: unknown }).metadata;
  }

  return parsed;
};

const isMissingPathError = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'ENOENT';

const formatParserError = (error: unknown): string => (error instanceof Error ? error.message : 'unknown parser error');

type MetadataReadResult =
  | { status: MetadataReadStatus.Missing }
  | { status: MetadataReadStatus.Invalid; message: string }
  | { status: MetadataReadStatus.NotRequired }
  | { status: MetadataReadStatus.Present; metadata: unknown };
