import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

const packageSchema = z.object({
  name: z.literal('@maxiedev/lotusagents'),
  version: z.string().min(1),
  description: z.string().min(1),
});

const packageJson = packageSchema.parse(require('../package.json'));

export const packageInfo = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
} as const;
