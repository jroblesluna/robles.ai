/** Export existing generated photos as Firefly reference frames; no generation/API calls. */
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const kit = path.join(root, 'creative/firefly-demo-clips');
const manifest = JSON.parse(await readFile(path.join(kit, 'manifest.json'), 'utf8'));
for (const demo of manifest.demos) {
  const destination = path.join(kit, demo.firstFrame);
  await mkdir(path.dirname(destination), { recursive: true });
  const result = await sharp(path.join(root, demo.sourceImage))
    .resize(960, 720, { fit: 'cover' })
    .extend({ left: 160, right: 160, top: 0, bottom: 0, background: '#0b1525' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(destination);
  console.log(`${demo.id}: ${result.width}x${result.height}, ${result.size} bytes`);
}
// Overview is a production aid, never a video input or a public website asset.
const tiles = await Promise.all(manifest.demos.map(async (demo, index) => {
  const photo = await sharp(path.join(kit, demo.firstFrame)).resize(240, 135).toBuffer();
  const label = Buffer.from(`<svg width="240" height="28"><text x="8" y="19" fill="#e2e8f0" font-family="Arial" font-size="12">${demo.id}</text></svg>`);
  return [{ input: photo, left: 10 + (index % 4) * 250, top: 10 + Math.floor(index / 4) * 175 },
    { input: label, left: 10 + (index % 4) * 250, top: 145 + Math.floor(index / 4) * 175 }];
}));
await sharp({ create: { width: 1010, height: 710, channels: 3, background: '#0f172a' } })
  .composite(tiles.flat()).webp({ quality: 88 }).toFile(path.join(kit, 'overview.webp'));
