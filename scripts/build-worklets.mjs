/**
 * Bundles each AudioWorklet entry point into a single self-contained ESM file
 * in public/worklets/.
 *
 * Worklets are loaded by URL via addModule(), not by the app bundler, so they
 * need to be built separately. Bundling to one file per worklet also sidesteps
 * inconsistent support for `import` inside AudioWorklet global scope across
 * browsers: the shipped file has no imports at all.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('public/worklets', { recursive: true });

await build({
  entryPoints: ['src/worklets/noise-processor.ts', 'src/worklets/drift-processor.ts'],
  outdir: 'public/worklets',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: false, // readable in devtools; these files are small
  logLevel: 'info',
});
