import { cleanPackageArtifacts } from './packageArtifactCleanup';

const removedPaths = await cleanPackageArtifacts(process.cwd());

if (removedPaths.length === 0) {
  console.log('No generated package artifacts found.');
} else {
  console.log(`Removed generated package artifacts: ${removedPaths.join(', ')}`);
}
