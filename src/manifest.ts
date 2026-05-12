import { z } from 'zod';
import { packageInfo } from './packageInfo.js';

export const lotusManifestSchemaVersion = 1;
export const lotusArtifactSchemaVersion = 1;
export const lotusArtifactContentVersion = packageInfo.version;

export const managedArtifactScopeSchema = z.enum(['local', 'docs']);
export const managedArtifactKindSchema = z.enum(['file', 'directory']);
export const managedArtifactTypeSchema = z.enum([
  'local-guidance',
  'local-issue-store',
  'local-review-store',
  'local-pr-note-store',
  'docs-guidance',
  'spec-store',
  'meeting-draft',
  'template-store',
]);
export const managedContentClassSchema = z.enum(['generated', 'user-editable']);
export const managedPrivacySchema = z.enum(['private', 'project']);
export const lotusProfileSchema = z.enum(['local-first', 'linear-first']);
export const lotusAgentSchema = z.enum(['codex', 'opencode', 'claude', 'cursor']);
export const migrationStrategySchema = z.enum(['frontmatter', 'structured-sections', 'directory-manifest']);

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

      if (artifact.path.startsWith('.local/') && artifact.metadata.privacy !== 'private') {
        context.addIssue({
          code: 'custom',
          message: `.local artifacts must be private: ${artifact.path}`,
          path: ['artifacts', index, 'metadata', 'privacy'],
        });
      }

      if (artifact.metadata.privacy === 'private' && (artifact.packageTemplate.include || artifact.packageTemplate.publicDocsAllowed)) {
        context.addIssue({
          code: 'custom',
          message: `Private artifacts must not be package templates or public docs: ${artifact.path}`,
          path: ['artifacts', index, 'packageTemplate'],
        });
      }
    }
  });

export type ManagedArtifactScope = z.infer<typeof managedArtifactScopeSchema>;
export type ManagedArtifact = z.infer<typeof managedArtifactSchema>;
export type LotusManifest = z.infer<typeof lotusManifestSchema>;

const localFirstProcedures = ['task-intake', 'pr-intake', 'meeting-promotion', 'spec-bootstrap'];

const rawLotusManifest = {
  manifest: 'lotus-managed-artifacts',
  schemaVersion: lotusManifestSchemaVersion,
  unmanagedExternalContentPolicy: 'ignore-unless-it-corrupts-lotus-managed-semantics',
  artifacts: [
    createArtifact({
      path: '.local/AGENTS.md',
      scope: 'local',
      kind: 'file',
      artifactType: 'local-guidance',
      privacy: 'private',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first', 'linear-first'],
      selectedProcedures: ['private-project-guidance'],
      migrationStrategy: 'frontmatter',
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/issues',
      scope: 'local',
      kind: 'directory',
      artifactType: 'local-issue-store',
      privacy: 'private',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['task-intake'],
      migrationStrategy: 'directory-manifest',
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/issues-notes',
      scope: 'local',
      kind: 'directory',
      artifactType: 'local-issue-store',
      privacy: 'private',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['task-intake'],
      migrationStrategy: 'directory-manifest',
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/reviews',
      scope: 'local',
      kind: 'directory',
      artifactType: 'local-review-store',
      privacy: 'private',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['pr-intake'],
      migrationStrategy: 'directory-manifest',
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.local/pr-notes',
      scope: 'local',
      kind: 'directory',
      artifactType: 'local-pr-note-store',
      privacy: 'private',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['pr-intake'],
      migrationStrategy: 'directory-manifest',
      includePackageTemplate: false,
      publicDocsAllowed: false,
    }),
    createArtifact({
      path: '.docs/AGENTS.md',
      scope: 'docs',
      kind: 'file',
      artifactType: 'docs-guidance',
      privacy: 'project',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: localFirstProcedures,
      migrationStrategy: 'frontmatter',
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
    createArtifact({
      path: '.docs/spec',
      scope: 'docs',
      kind: 'directory',
      artifactType: 'spec-store',
      privacy: 'project',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['spec-bootstrap'],
      migrationStrategy: 'directory-manifest',
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
    createArtifact({
      path: '.docs/meetings/_draft.md',
      scope: 'docs',
      kind: 'file',
      artifactType: 'meeting-draft',
      privacy: 'project',
      contentClass: 'generated',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['meeting-promotion'],
      migrationStrategy: 'structured-sections',
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
    createArtifact({
      path: '.docs/templates',
      scope: 'docs',
      kind: 'directory',
      artifactType: 'template-store',
      privacy: 'project',
      contentClass: 'user-editable',
      selectedProfiles: ['local-first'],
      selectedProcedures: ['task-intake', 'pr-intake', 'meeting-promotion', 'spec-bootstrap'],
      migrationStrategy: 'directory-manifest',
      includePackageTemplate: true,
      publicDocsAllowed: true,
    }),
  ],
} satisfies LotusManifest;

export const lotusManifest = lotusManifestSchema.parse(rawLotusManifest);
export const managedArtifacts = lotusManifest.artifacts;
export const managedArtifactPaths = managedArtifacts.map((artifact) => artifact.path);

export function getManagedArtifact(managedPath: string): ManagedArtifact | undefined {
  return managedArtifacts.find((artifact) => artifact.path === managedPath);
}

function isPathInArtifactScope(path: string, scope: ManagedArtifactScope): boolean {
  return scope === 'local' ? path.startsWith('.local/') : path.startsWith('.docs/');
}

type CreateArtifactInput = {
  path: string;
  scope: ManagedArtifactScope;
  kind: z.infer<typeof managedArtifactKindSchema>;
  artifactType: z.infer<typeof managedArtifactTypeSchema>;
  privacy: z.infer<typeof managedPrivacySchema>;
  contentClass: z.infer<typeof managedContentClassSchema>;
  selectedProfiles: Array<z.infer<typeof lotusProfileSchema>>;
  selectedAgents?: Array<z.infer<typeof lotusAgentSchema>>;
  selectedProcedures: string[];
  migrationStrategy: z.infer<typeof migrationStrategySchema>;
  includePackageTemplate: boolean;
  publicDocsAllowed: boolean;
};

function createArtifact(input: CreateArtifactInput): ManagedArtifact {
  return {
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
  };
}
