import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts', 'src/index.ts'],
    format: ['esm'],
    target: 'es2022',
    platform: 'node',
    sourcemap: true,
    splitting: false,
    outDir: 'dist',
    clean: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    outDir: 'dist',
    dts: {
      only: true,
    },
    clean: false,
  },
]);
