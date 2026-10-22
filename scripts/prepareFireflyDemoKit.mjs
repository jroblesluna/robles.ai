/** Validate the generated v2 frames and render an overview; never replaces them with v1 photos. */
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const kit = path.join(root, 'creative/firefly-demo-clips');
const manifest = JSON.parse(await readFile(path.join(kit, 'manifest.json'), 'utf8'));
if (manifest.version !== 2) throw new Error('This tool expects the self-contained v2 kit.');
for (const demo of manifest.demos) {
  const bytes = await readFile(path.join(kit, demo.firstFrame));
  const image = await sharp(bytes).metadata();
  if (image.width !== 1280 || image.height !== 720 || image.format !== 'jpeg' || bytes.length > manifest.firstFrame.maxBytes) throw new Error(`Invalid first frame: ${demo.id}`);
  if ((await readFile(path.join(kit, demo.promptFile), 'utf8')).trim() !== demo.prompt || !demo.selfContained) throw new Error(`Invalid prompt: ${demo.id}`);
  console.log(`${demo.id}: ${image.width}x${image.height}, ${bytes.length} bytes, self-contained`);
}
const tiles = await Promise.all(manifest.demos.map(async (demo, index) => {
  const photo = await sharp(path.join(kit, demo.firstFrame)).resize(320, 180, { fit: 'contain', background: '#0f172a' }).toBuffer();
  const label = Buffer.from(`<svg width="320" height="30"><text x="8" y="21" fill="#e2e8f0" font-family="Arial" font-size="14">${demo.id}</text></svg>`);
  return [{ input: photo, left: 10 + (index % 4) * 330, top: 10 + Math.floor(index / 4) * 220 },
    { input: label, left: 10 + (index % 4) * 330, top: 190 + Math.floor(index / 4) * 220 }];
}));
await sharp({ create: { width: 1330, height: 890, channels: 3, background: '#0f172a' } })
  .composite(tiles.flat()).webp({ quality: 90 }).toFile(path.join(kit, 'overview-v2.webp'));
