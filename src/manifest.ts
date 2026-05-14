import { z } from 'zod';
import { enumValues } from './enumValues';
import { packageInfo } from './packageInfo';

export const lotusManifestSchemaVersion = 1;
export const lotusArtifactSchemaVersion = 1;
export const lotusArtifactContentVersion = packageInfo.version;

export enum ManagedArtifactScope {
  Local = 'local',
  Docs = 'docs',
}

export enum ManagedArtifactKind {
  File = 'file',
  Directory = 'directory',
}

export enum ManagedArtifactType {
  LocalGuidance = 'local-guidance',
  LocalIssueStore = 'local-issue-store',
  LocalIssueNoteStore = 'local-issue-note-store',
  LocalReviewStore = 'local-review-store',
  LocalPrNoteStore = 'local-pr-note-store',
  DocsGuidance = 'docs-guidance',
  SpecStore = 'spec-store',
  MeetingDraft = 'meeting-draft',
  TemplateStore = 'template-store',
}

export enum ManagedContentClass {
  Generated = 'generated',
  UserEditable = 'user-editable',
}

export enum ManagedPrivacy {
  Private = 'private',
  Project = 'project',
}

export enum LotusProfile {
  LocalFirst = 'local-first',
  LinearFirst = 'linear-first',
}

export enum LotusAgent {
  Codex = 'codex',
  Opencode = 'opencode',
  Claude = 'claude',
  Cursor = 'cursor',
}

export enum MigrationStrategy {
  Frontmatter = 'frontmatter',
  StructuredSections = 'structured-sections',
  DirectoryManifest = 'directory-manifest',
}

export const managedArtifactScopeSchema = z.enum(enumValues(ManagedArtifactScope));
export const managedArtifactKindSchema = z.enum(enumValues(ManagedArtifactKind));
export const managedArtifactTypeSchema = z.enum(enumValues(ManagedArtifactType));
export const managedContentClassSchema = z.enum(enumValues(ManagedContentClass));
export const managedPrivacySchema = z.enum(enumValues(ManagedPrivacy));
export const lotusProfileSchema = z.enum(enumValues(LotusProfile));
export const lotusAgentSchema = z.enum(enumValues(LotusAgent));
export const migrationStrategySchema = z.enum(enumValues(MigrationStrategy));

const semanticVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const lotusArtifactMetadataSchema = z.object({
  lotus: z.literal('managed-artifact'),
  scope: managedArtifactScopeSchema,
  artifactType: managedArtifactTypeSchema,
  schemaVersion: z.literal(lotusArtifactSchemaVersion),
  contentVersion: z.string().regex(semanticVersionPattern),
  privacy: managedPrivacySchema,
  contentClass: managedContentClassSchema,
  selectedProfiles: z.array(lotusProfileSchema),
  selectedAgents: z.array(lotusAgentSchema),
  selectedProcedures: z.array(z.string().min(1)),
});

export const managedArtifactSchema = z.object({
  path: z.string().min(1),
  scope: managedArtifactScopeSchema,
  kind: managedArtifactKindSchema,
  metadata: lotusArtifactMetadataSchema,
  migration: z.object({
    strategy: migrationStrategySchema,
    currentSchemaVersion: z.literal(lotusArtifactSchemaVersion),
  }),
  packageTemplate: z.object({
    include: z.boolean(),
    publicDocsAllowed: z.boolean(),
  }),
});

export const lotusManifestSchema = z
  .object({
    manifest: z.literal('lotus-managed-artifacts'),
    schemaVersion: z.literal(lotusManifestSchemaVersion),
    artifacts: z.array(managedArtifactSchema).min(1),
    unmanagedExternalContentPolicy: z.literal('ignore-unless-it-corrupts-lotus-managed-semantics'),
  })
  .superRefine((manifest, context) => {
    const paths = new Set<string>();

    for (const [index, artifact] of manifest.artifacts.entries()) {
      if (paths.has(artifact.path)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate managed artifact path: ${artifact.path}`,
          path: ['artifacts', index, 'path'],
        });
      }

      paths.add(artifact.path);

      if (artifact.scope !== artifact.metadata.scope) {
        context.addIssue({
          code: 'custom',
          message: `Artifact scope and metadata scope must match for ${artifact.path}`,
          path: ['artifacts', index, 'metadata', 'scope'],
        });
      }

      if (!isPathInArtifactScope(artifact.path, artifact.scope)) {
        context.addIssue({
          code: 'custom',
          message: `Artifact path must stay within the ${artifact.scope} namespace: ${artifact.path}`,
          path: ['artifacts', index, 'path'],
        });
      }

      if (artifact.path.startsWith('.local/') && artifact.metadata.privacy !== ManagedPrivacy.Private) {
        context.addIssue({
          code: 'custom',
          message: `.local artifacts must be private: ${artifact.path}`,
          path: ['artifacts', index, 'metadata', 'privacy'],
        });
      }

      if (
        artifact.metadata.privacy === ManagedPrivacy.Private &&
        (artifact.packageTemplate.include || artifact.packageTemplate.publicDocsAllowed)
      ) {
        context.addIssue({
          code: 'custom',
          message: `Private artifacts must not be package templates or public docs: ${artifact.path}`,
          path: ['artifacts', index, 'packageTemplate'],
        });
      }
    }
  });

export type ManagedArtifact = z.infer<typeof managedArtifactSchema>;
export type LotusManifest = z.infer<typeof lotusManifestSchema>;

type CreateArtifactInput = {
  path: string;
  scope: ManagedArtifactScope;
  kind: ManagedArtifactKind;
  artifactType: ManagedArtifactType;
  privacy: ManagedPrivacy;
  contentClass: ManagedContentClass;
  selectedProfiles: LotusProfile[];
  selectedAgents?: LotusAgent[];
  selectedProcedures: string[];
  migrationStrategy: MigrationStrategy;
  includePackageTemplate: boolean;
  publicDocsAllowed: boolean;
};

const createArtifact = (input: CreateArtifactInput): ManagedArtifact => ({
  path: input.path,
  scope: input.scope,
  kind: input.kind,
  metadata: {
    lotus: 'managed-artifact',
    scope: input.scope,
    artifactType: input.artifactType,
    schemaVersion: lotusArtifactSchemaVersion,
    contentVersion: lotusArtifactContentVersion,
    privacy: input.privacy,
    contentClass: input.contentClass,
    selectedProfiles: input.selectedProfiles,
    selectedAgents: input.selectedAgents ?? [],
    selectedProcedures: input.selectedProcedures,
  },
  migration: {
    strategy: input.migrationStrategy,
    currentSchemaVersion: lotusArtifactSchemaVersion,
  },
  packageTemplate: {
    include: input.includePackageTemplate,
    publicDocsAllowed: input.publicDocsAllowed,
  },
});

const isPathInArtifactScope = (path: string, scope: ManagedArtifactScope): boolean =>
  scope === ManagedArtifactScope.Local ? path.startsWith('.local/') : path.startsWith('.docs/');

const localFirstProcedures = ['task-intake', 'pr-intake', 'meeting-promotion', 'spec-bootstrap'];

const rawLotusManifest = {
  manifest: 'lotus-managed-artifacts',
  schemaVersion: lotusManifestSchemaVersion,
  unmanagedExternalContentPolicy: 'ignore-unless-it-corrupts-lotus-managed-semantics',
  artifacts: [
    createArtifact({
      path: '.local/AGENTS.md',
      scope: ManagedArtifactScope.Local,
      kind: ManagedArtifactKind.File,
      artifactType: ManagedArtifactType.LocalGuidance,
      privacy: ManagedPrivacy.Private,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst, LotusProfile.LinearFirst],
      selectedProcedures: ['private-project-guidance'],
      migrationStrategy: MigrationStrategy.Frontmatter,
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/issues',
      scope: ManagedArtifactScope.Local,
      kind: ManagedArtifactKind.Directory,
      artifactType: ManagedArtifactType.LocalIssueStore,
      privacy: ManagedPrivacy.Private,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['task-intake'],
      migrationStrategy: MigrationStrategy.DirectoryManifest,
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/issues-notes',
      scope: ManagedArtifactScope.Local,
      kind: ManagedArtifactKind.Directory,
      artifactType: ManagedArtifactType.LocalIssueNoteStore,
      privacy: ManagedPrivacy.Private,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['task-intake'],
      migrationStrategy: MigrationStrategy.DirectoryManifest,
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/reviews',
      scope: ManagedArtifactScope.Local,
      kind: ManagedArtifactKind.Directory,
      artifactType: ManagedArtifactType.LocalReviewStore,
      privacy: ManagedPrivacy.Private,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['pr-intake'],
      migrationStrategy: MigrationStrategy.DirectoryManifest,
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/pr-notes',
      scope: ManagedArtifactScope.Local,
      kind: ManagedArtifactKind.Directory,
      artifactType: ManagedArtifactType.LocalPrNoteStore,
      privacy: ManagedPrivacy.Private,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['pr-intake'],
      migrationStrategy: MigrationStrategy.DirectoryManifest,
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.docs/AGENTS.md',
      scope: ManagedArtifactScope.Docs,
      kind: ManagedArtifactKind.File,
      artifactType: ManagedArtifactType.DocsGuidance,
      privacy: ManagedPrivacy.Project,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: localFirstProcedures,
      migrationStrategy: MigrationStrategy.Frontmatter,
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
    createArtifact({
      path: '.docs/spec',
      scope: ManagedArtifactScope.Docs,
      kind: ManagedArtifactKind.Directory,
      artifactType: ManagedArtifactType.SpecStore,
      privacy: ManagedPrivacy.Project,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['spec-bootstrap'],
      migrationStrategy: MigrationStrategy.DirectoryManifest,
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
    createArtifact({
      path: '.docs/meetings/_draft.md',
      scope: ManagedArtifactScope.Docs,
      kind: ManagedArtifactKind.File,
      artifactType: ManagedArtifactType.MeetingDraft,
      privacy: ManagedPrivacy.Project,
      contentClass: ManagedContentClass.Generated,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['meeting-promotion'],
      migrationStrategy: MigrationStrategy.StructuredSections,
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
    createArtifact({
      path: '.docs/templates',
      scope: ManagedArtifactScope.Docs,
      kind: ManagedArtifactKind.Directory,
      artifactType: ManagedArtifactType.TemplateStore,
      privacy: ManagedPrivacy.Project,
      contentClass: ManagedContentClass.UserEditable,
      selectedProfiles: [LotusProfile.LocalFirst],
      selectedProcedures: ['task-intake', 'pr-intake', 'meeting-promotion', 'spec-bootstrap'],
      migrationStrategy: MigrationStrategy.DirectoryManifest,
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
  ],
} satisfies LotusManifest;

export const lotusManifest = lotusManifestSchema.parse(rawLotusManifest);
export const managedArtifacts = lotusManifest.artifacts;
export const managedArtifactPaths = managedArtifacts.map((artifact) => artifact.path);

export const getManagedArtifact = (managedPath: string): ManagedArtifact | undefined =>
  managedArtifacts.find((artifact) => artifact.path === managedPath);
