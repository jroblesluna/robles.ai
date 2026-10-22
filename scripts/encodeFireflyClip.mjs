/** Optimize a reviewed Firefly master; never deploys or modifies runtime availability. */
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
const manifest = JSON.parse(await readFile(new URL('../creative/firefly-demo-clips/manifest.json', import.meta.url), 'utf8'));
const delivery = manifest.delivery;
if (manifest.version !== 2 || delivery.crop !== 'none' || delivery.externalExplanatoryOverlays !== false) throw new Error('Expected self-contained, full-frame v2 delivery settings.');
const [id, input, outputDirectory] = process.argv.slice(2);
const demo = manifest.demos.find(item => item.id === id);
if (!demo || !input || !outputDirectory) {
  throw new Error('Usage: node scripts/encodeFireflyClip.mjs <known-demo-id> <master.mp4> <output-directory>');
}
function probe(file) {
  const result = spawnSync(ffprobe.path, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('FFprobe could not read the video input/output.');
  return JSON.parse(result.stdout);
}
const source = path.resolve(input);
const before = probe(source);
const video = before.streams.find(stream => stream.codec_type === 'video');
if (!video || Math.abs(video.width / video.height - 16 / 9) > 0.01 || Number(before.format.duration) < delivery.durationSeconds - 0.1) {
  throw new Error(`Master must be a 16:9 video at least ${delivery.durationSeconds - 0.1} seconds long; no file encoded.`);
}
if (Number(video.tags?.rotate || 0) !== 0 || video.side_data_list?.some(data => Number(data.rotation || 0) !== 0)) {
  throw new Error('Normalize the video rotation before encoding; no file encoded.');
}
const destination = path.join(path.resolve(outputDirectory), demo.webVideoName);
if (source === destination) throw new Error('Input and output must differ.');
await mkdir(path.dirname(destination), { recursive: true });
const result = spawnSync(ffmpeg.path, ['-n', '-hide_banner', '-loglevel', 'error', '-i', source,
  '-map', '0:v:0', '-t', String(delivery.durationSeconds), '-vf', `scale=${delivery.width}:${delivery.height},fps=${delivery.fps},setsar=1`,
  '-an', '-map_metadata', '-1', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
  '-maxrate', '600k', '-bufsize', '1200k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { encoding: 'utf8' });
if (result.status !== 0) throw new Error(`FFmpeg failed (existing output files are never overwritten): ${result.stderr}`);
const after = probe(destination);
const out = after.streams.find(stream => stream.codec_type === 'video');
const bytes = (await stat(destination)).size;
const duration = Number(after.format.duration);
if (out?.width !== delivery.width || out?.height !== delivery.height || out?.r_frame_rate !== `${delivery.fps}/1` || after.streams.some(stream => stream.codec_type === 'audio') || duration < delivery.durationSeconds - 0.1 || duration > delivery.durationSeconds + 0.1 || bytes > manifest.delivery.maxBytes) {
  throw new Error(`Output fails delivery requirements and is not approved for publishing: ${destination} (${bytes} bytes). File retained for inspection.`);
}
console.log(JSON.stringify({ id, file: destination, bytes, duration, width: out.width, height: out.height, fps: out.r_frame_rate, audio: false, approvedTechnicalFormat: true }, null, 2));
