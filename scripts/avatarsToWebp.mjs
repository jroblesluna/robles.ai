// Converts every PNG in public/avatars to WebP and deletes the PNG.
// Usage: node scripts/avatarsToWebp.mjs [--keep]   (--keep leaves the PNGs)
// Re-run after src/scripts/generateAvatars.ts, which still writes PNGs.
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.resolve('public/avatars');
const MAX_SIDE = 1024; // headshots are shown far smaller; never upscales
const keep = process.argv.includes('--keep');

let before = 0;
let after = 0;
for (const file of (await readdir(DIR)).filter((f) => f.endsWith('.png'))) {
  const src = path.join(DIR, file);
  const out = src.replace(/\.png$/, '.webp');
  await sharp(src)
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 6, smartSubsample: true })
    .toFile(out);
  const [a, b] = [(await stat(src)).size, (await stat(out)).size];
  before += a;
  after += b;
  console.log(`${file.padEnd(32)} ${(a / 1024).toFixed(0).padStart(6)} KB → ${(b / 1024).toFixed(0).padStart(5)} KB`);
  if (!keep) await unlink(src);
}
console.log(`\nTotal: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);
