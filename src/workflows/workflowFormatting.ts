import { match } from 'ts-pattern';
import { ManagedContentClass, managedArtifacts } from '../manifest';
import { RemoveScope } from '../types';

export function formatRemoveScope(removeScope: RemoveScope): string {
  return match(removeScope)
    .with(RemoveScope.Local, () => '.local artifacts')
    .with(RemoveScope.Docs, () => '.docs artifacts')
    .with(RemoveScope.All, () => 'all artifacts')
    .exhaustive();
}

export function formatUserEditableManagedPaths(): string {
  return managedArtifacts
    .filter((artifact) => artifact.metadata.contentClass === ManagedContentClass.UserEditable)
    .map((artifact) => artifact.path)
    .join(', ');
}
