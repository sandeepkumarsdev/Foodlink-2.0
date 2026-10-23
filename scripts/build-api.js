import esbuild from 'esbuild';

const banner = `
import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import * as __nodePath from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __nodePath.dirname(__filename);
`;

try {
  await esbuild.build({
    entryPoints: ['backend/api.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    outfile: 'api/index.js',
    banner: {
      js: banner,
    },
    external: ['pg-native', 'lightningcss', '@electric-sql/pglite'],
  });

  console.log('[build-api] Successfully bundled api/index.js with CJS shim');
} catch (err) {
  console.error('[build-api] Failed to bundle:', err);
  process.exit(1);
}
