/**
 * One-time icon generator — run with: node client/scripts/generate-icons.mjs
 *
 * Builds the SIMS DMS app mark — a white graduation cap (mortarboard) on the
 * blue→indigo brand gradient (linear-gradient(135deg, #3b82f6, #6366f1), see the
 * design system BrandMark) — and rasterizes it to the PWA icon set.
 *
 * Outputs to client/public/icons/: icon-192.png, icon-512.png,
 * icon-512-maskable.png. Also (re)writes client/public/favicon.svg.
 * Commit the generated files; rerun only when the mark changes.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const outDir = join(publicDir, 'icons');
mkdirSync(outDir, { recursive: true });

// The mortarboard, authored on a 512×512 canvas, visually centered.
const cap = `
  <g transform="translate(0,14)">
    <!-- tassel cord + bob (drawn first; the board overlaps its hidden run) -->
    <path d="M256 214 Q360 222 414 214 L414 318" fill="none"
          stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="402" y="312" width="24" height="44" rx="12" fill="#ffffff"/>
    <!-- cap front (head piece); board drawn on top to hide its top edge -->
    <path d="M188 250 L324 250 L324 292 Q324 326 256 326 Q188 326 188 292 Z"
          fill="#ffffff" fill-opacity="0.92"/>
    <!-- mortarboard top (flat diamond) -->
    <path d="M256 150 L420 214 L256 278 L92 214 Z" fill="#ffffff"/>
    <!-- center button -->
    <circle cx="256" cy="214" r="13" fill="#4f46e5"/>
  </g>`;

const gradient = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
  </defs>`;

// "any" — rounded tile, cap at ~70% of the canvas.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${gradient}
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g transform="translate(256 256) scale(1.1) translate(-256 -256)">${cap}</g>
</svg>`;

// "maskable" — full-bleed tile (the OS applies its own mask); cap kept inside
// the safe zone (center 80%) by scaling down.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${gradient}
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">${cap}</g>
</svg>`;

// favicon — tighter corners read better at 16–32px.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${gradient}
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <g transform="translate(256 256) scale(1.12) translate(-256 -256)">${cap}</g>
</svg>`;

const png = (svg) => sharp(Buffer.from(svg)).png();
await png(anySvg).resize(192, 192).toFile(join(outDir, 'icon-192.png'));
console.log('  icon-192.png');
await png(anySvg).resize(512, 512).toFile(join(outDir, 'icon-512.png'));
console.log('  icon-512.png');
await png(maskableSvg).resize(512, 512).toFile(join(outDir, 'icon-512-maskable.png'));
console.log('  icon-512-maskable.png');
writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg.trim() + '\n');
console.log('  favicon.svg');

console.log('Done — commit client/public/icons/ and client/public/favicon.svg.');
