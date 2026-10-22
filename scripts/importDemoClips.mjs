/** Import approved masters without modifying them; requires existing FFmpeg/Sharp dependencies. */
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [inputDirectory, imagegenFallback] = process.argv.slice(2);
if (!inputDirectory) throw new Error('Usage: node scripts/importDemoClips.mjs <masters-directory> [imagegen-master.mp4]');
const ids = JSON.parse(await readFile(path.join(root, 'src/i18n/locales/en/translation.json'), 'utf8')).demosCatalog.items.map(item => item.id);
const directory = path.join(root, 'public/assets/demo-previews');
const scratch = path.join(root, '.demo-clip-import');
await mkdir(directory, { recursive: true });
await mkdir(scratch, { recursive: true });
await mkdir(path.join(root, 'src/data'), { recursive: true });
const available = await readdir(inputDirectory);
const manifest = {};
const report = [];
const digest = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 12);
function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Media command failed');
  return result.stdout;
}
function probe(file) {
  const metadata = JSON.parse(run(ffprobe.path, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
  return { metadata, video: metadata.streams.find(stream => stream.codec_type === 'video') };
}
for (const id of ids) {
  const input = available.includes(`${id}.mp4`) ? path.resolve(inputDirectory, `${id}.mp4`) : id === 'imagegen' && imagegenFallback ? path.resolve(imagegenFallback) : null;
  if (!input) throw new Error(`Missing approved master: ${id}`);
  const before = probe(input);
  if (!before.video || Math.abs(before.video.width / before.video.height - 16 / 9) > .01 || Number(before.metadata.format.duration) > 30) throw new Error(`Invalid master: ${id}`);
  const encoded = path.join(scratch, `${id}.mp4`);
  run(ffmpeg.path, ['-y', '-v', 'error', '-i', input, '-map', '0:v:0', '-vf', 'scale=960:540:force_original_aspect_ratio=decrease,fps=24,setsar=1', '-an', '-map_metadata', '-1', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-maxrate', '650k', '-bufsize', '1300k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', encoded]);
  const after = probe(encoded), videoBytes = await readFile(encoded);
  if (videoBytes.length > 750000 || after.video.width > 960 || after.video.height > 540 || after.metadata.streams.some(stream => stream.codec_type === 'audio') || after.video.r_frame_rate !== '24/1' || Math.abs(Number(after.metadata.format.duration) - Number(before.metadata.format.duration)) > .1) throw new Error(`Delivery validation failed: ${id}`);
  const videoName = `${id}-${digest(videoBytes)}.mp4`;
  await writeFile(path.join(directory, videoName), videoBytes);
  const still = path.join(scratch, `${id}.png`);
  run(ffmpeg.path, ['-y', '-v', 'error', '-ss', String(Math.min(7.2, Number(after.metadata.format.duration) - .25)), '-i', encoded, '-frames:v', '1', still]);
  const posters = {};
  for (const width of [480, 960]) {
    const bytes = await sharp(still).resize({ width }).webp({ quality: 84 }).toBuffer();
    const name = `${id}-${width}-${digest(bytes)}.webp`;
    await writeFile(path.join(directory, name), bytes);
    posters[width] = `/assets/demo-previews/${name}`;
  }
  manifest[id] = { src: `/assets/demo-previews/${videoName}`, poster: posters[480], posterLarge: posters[960], width: after.video.width, height: after.video.height, duration: Number(after.metadata.format.duration), bytes: videoBytes.length };
  report.push({ id, source: path.basename(input), sourceSha256: createHash('sha256').update(await readFile(input)).digest('hex'), sourceBytes: (await stat(input)).size, sourceWidth: before.video.width, sourceHeight: before.video.height, ...manifest[id] });
  console.log(`${id}: ${videoBytes.length} bytes, ${after.video.width}x${after.video.height}`);
}
await writeFile(path.join(root, 'src/data/demoClips.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(root, 'docs/DEMO_VIDEO_ASSETS.json'), JSON.stringify({ importedDate: '2026-10-22', notes: 'Approved exported masters; imagegen uses the last generated 2.5D orbit master when absent from exports. Roadmap status is unchanged. Clips are illustrative and embedded text is English.', totalSourceBytes: report.reduce((n, item) => n + item.sourceBytes, 0), totalVideoBytes: report.reduce((n, item) => n + item.bytes, 0), clips: report }, null, 2) + '\n');
