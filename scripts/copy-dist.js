import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDist = path.resolve(rootDir, 'frontend', 'dist');
const rootDist = path.resolve(rootDir, 'dist');

try {
  if (fs.existsSync(frontendDist)) {
    fs.cpSync(frontendDist, rootDist, { recursive: true, force: true });
    console.log('[copy-dist] Copied frontend/dist -> dist');
  }
  if (fs.existsSync(rootDist) && !fs.existsSync(frontendDist)) {
    fs.cpSync(rootDist, frontendDist, { recursive: true, force: true });
    console.log('[copy-dist] Copied dist -> frontend/dist');
  }
} catch (err) {
  console.error('[copy-dist] Error synchronizing dist directories:', err);
}
