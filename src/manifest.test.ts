import { describe, expect, it } from 'vitest';
import { lotusArtifactMetadataSchema, lotusManifest, lotusManifestSchema, ManagedPrivacy, managedArtifacts } from './manifest';

describe('manifest', () => {
  it('defines semantic metadata for every Lotus-managed artifact', () => {
    expect(lotusManifestSchema.parse(lotusManifest)).toEqual(lotusManifest);

    for (const artifact of managedArtifacts) {
      expect(lotusArtifactMetadataSchema.parse(artifact.metadata)).toEqual(artifact.metadata);
      expect(artifact.metadata.lotus).toBe('managed-artifact');
      expect(artifact.metadata.schemaVersion).toBe(1);
      expect(lotusArtifactMetadataSchema.parse({ ...artifact.metadata, contentVersion: '1.2.3-beta.1+build.5' }).contentVersion).toBe(
        '1.2.3-beta.1+build.5',
      );

      if (artifact.path.startsWith('.local/')) {
        expect(artifact.metadata.privacy).toBe(ManagedPrivacy.Private);
        expect(artifact.packageTemplate.include).toBe(false);
        expect(artifact.packageTemplate.publicDocsAllowed).toBe(false);
      }
    }
  });

  it('rejects unsupported managed artifact schema versions', () => {
    const [artifact] = managedArtifacts;

    expect(
      lotusArtifactMetadataSchema.safeParse({
        ...artifact.metadata,
        schemaVersion: 2,
      }).success,
    ).toBe(false);
  });

  it('rejects manifest artifacts outside their scope namespace', () => {
    const [artifact] = managedArtifacts;

    expect(
      lotusManifestSchema.safeParse({
        ...lotusManifest,
        artifacts: [
          {
            ...artifact,
            path: '.docs/private.md',
          },
          ...managedArtifacts.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it('keeps local issue, review, and PR-note stores out of the linear-first-only profile', () => {
    const localFirstOnlyPaths = managedArtifacts
      .filter((artifact) => artifact.metadata.selectedProfiles.length === 1 && artifact.metadata.selectedProfiles[0] === 'local-first')
      .map((artifact) => artifact.path);

    expect(localFirstOnlyPaths).toEqual(expect.arrayContaining(['.local/issues', '.local/reviews', '.local/pr-notes']));
  });
});
