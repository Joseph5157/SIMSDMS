/**
 * One-time icon generator — run with: node client/scripts/generate-icons.mjs
 * Outputs 192x192 and 512x512 PNGs plus a maskable 512 to client/public/icons/.
 * Commit the generated PNGs; this script does not need to run again unless favicon.svg changes.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg    = readFileSync(join(__dirname, '../public/favicon.svg'));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

// Transparent background for standard any-purpose icons
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
// #f8fafc matches manifest background_color — used for maskable safe-zone padding
const bg = { r: 248, g: 250, b: 252, alpha: 1 };

await sharp(svg)
  .resize(192, 192, { fit: 'contain', background: transparent })
  .png()
  .toFile(join(outDir, 'icon-192.png'));
console.log('  icon-192.png');

await sharp(svg)
  .resize(512, 512, { fit: 'contain', background: transparent })
  .png()
  .toFile(join(outDir, 'icon-512.png'));
console.log('  icon-512.png');

// Maskable: content fills the 80 % safe zone (410 px), 51 px padding each side.
// Separate from the any-purpose 512 — combining "any maskable" on one entry is an anti-pattern.
const safe = Math.round(512 * 0.8); // 410
const pad  = Math.round((512 - safe) / 2); // 51
await sharp(svg)
  .resize(safe, safe, { fit: 'contain', background: bg })
  .extend({ top: pad, bottom: 512 - safe - pad, left: pad, right: 512 - safe - pad, background: bg })
  .png()
  .toFile(join(outDir, 'icon-512-maskable.png'));
console.log('  icon-512-maskable.png');

console.log('Done — commit client/public/icons/ to the repo.');
