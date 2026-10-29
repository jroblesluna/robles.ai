// Converts every PNG in a folder to WebP next to it (same size, PNGs kept).
// Usage: node scripts/pngToWebp.mjs "<folder>" [quality=95]
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [dir, q = '95'] = process.argv.slice(2);
if (!dir) throw new Error('Usage: node scripts/pngToWebp.mjs "<folder>" [quality]');
const quality = Number(q);

for (const file of (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.png'))) {
  const src = path.join(dir, file);
  const out = src.replace(/\.png$/i, '.webp');
  await sharp(src).webp({ quality, effort: 6, smartSubsample: true }).toFile(out);
  const [a, b] = [(await stat(src)).size, (await stat(out)).size];
  console.log(`${file.padEnd(28)} ${(a / 1024).toFixed(0).padStart(6)} KB → ${(b / 1024).toFixed(0).padStart(5)} KB`);
}
