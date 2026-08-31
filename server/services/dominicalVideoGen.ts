import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import OpenAI from 'openai';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import db from '../db.js';
import { getArticleContentSummary } from '../jobs/generateDominical.js';
import type { ScoredPost } from './dominicalScoring.js';
import { computeRobotPose, renderRobotFrameSvg, VARIANT_NATIVE_SIZE, type RobotVariant } from './robotFrames.js';
import { buildCaptionOverlaySvg, buildWhiteboardCaptionSvg, VIDEO_CAPTION_BAND_HEIGHT } from './slideCompositor.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const LOGO_PATH = path.resolve(process.cwd(), 'public/images/logo.png');
const FRAME_RATE = 25;
const TARGET_WIDTH = 1080;
const LOGO_WIDTH = 180;
const LOGO_HEIGHT = 50;
const LOGO_TOP = 15;
const LOGO_LEFT = 15;
const MIN_SENTENCE_SECONDS = 1.2;

// Soft white (Tailwind slate-50) — frames are rasterized with a transparent
// background, and ffmpeg has no alpha channel in yuv420p, so without an
// explicit opaque backdrop composited in first it defaults transparent
// pixels to black once encoded. This is what the video actually renders on.
const BACKGROUND_COLOR = { r: 248, g: 250, b: 252, alpha: 255 };

// Where captions render inside the "pointing" variant's whiteboard, in that
// SVG's own 900x500 coordinate space (see public/robly-avatar/robly-pointing.svg) —
// scaled up along with everything else when frames are rendered at TARGET_WIDTH.
const WHITEBOARD_TEXT_ZONE_NATIVE = { x: 480, y: 165, width: 370, height: 205 };

function getFrameDimensions(variant: RobotVariant): { width: number; height: number; scale: number } {
  const native = VARIANT_NATIVE_SIZE[variant];
  const scale = TARGET_WIDTH / native.width;
  const height = Math.round((native.height * scale) / 2) * 2; // keep even for yuv420p
  return { width: TARGET_WIDTH, height, scale };
}

/**
 * Generates a themed AI background for the video (one image per generation,
 * reused across every frame) via gpt-image-1 — same model already used for
 * carousel slide backgrounds (see carouselImageGen.ts). Kept soft/blurred and
 * low-contrast on purpose so the robot and whiteboard composited on top stay
 * readable without needing any extra scrim layer.
 */
async function generateVideoBackground(
  selectedPosts: ScoredPost[],
  apiKey: string,
  frameWidth: number,
  frameHeight: number
): Promise<Buffer> {
  const topics = selectedPosts.map((p) => p.title).slice(0, 3).join('; ');
  const prompt =
    `Abstract, softly blurred background scene evoking this week's AI news themes: ${topics}. ` +
    'Style: soft bokeh, dreamy depth-of-field, gentle gradients, subtle glowing tech/circuit motifs, ' +
    'like an out-of-focus futuristic tech studio backdrop. ' +
    'Color palette: deep navy and slate blues with soft purple and cyan glow accents. ' +
    'IMPORTANT: keep it low-contrast, soft and uncluttered — no sharp focal subjects, no readable text, ' +
    'no letters, no logos, no human or robot figures, no watermarks — it must work purely as a blurred ' +
    'backdrop behind foreground graphics without competing for attention. Landscape wide composition.';

  const openai = new OpenAI({ apiKey });
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1536x1024',
  });

  const b64Data = response.data?.[0]?.b64_json;
  const urlData = response.data?.[0]?.url;
  let imageBuffer: Buffer;
  if (b64Data) {
    imageBuffer = Buffer.from(b64Data, 'base64');
  } else if (urlData) {
    const fetchResponse = await fetch(urlData);
    if (!fetchResponse.ok) throw new Error(`Failed to download generated background: ${fetchResponse.status}`);
    imageBuffer = Buffer.from(await fetchResponse.arrayBuffer());
  } else {
    throw new Error('gpt-image-1 returned no background image data');
  }

  return sharp(imageBuffer).resize(frameWidth, frameHeight, { fit: 'cover' }).png().toBuffer();
}

const VOICE_INSTRUCTIONS =
  'An extremely young, tiny toddler-like baby-robot voice: very small, very ' +
  'high-pitched and very thin, extremely cute and innocent, like a miniature ' +
  'robot toy just learning to talk. Still slightly male-leaning, not female. ' +
  'Combine with a clearly mechanical, digitized, synthesizer-like robotic ' +
  'texture. Deliver it LIVELY and ANIMATED: energetic pacing, bouncy rhythm, ' +
  'expressive rising and falling pitch on key words, sounding excited and ' +
  'enthusiastic like a cartoon character, never flat or monotone. ' +
  'Adorable and friendly, never scary. Neutral Spanish pronunciation.';

function getApiKey(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;
  const apiKey = row?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set it in Admin Settings or as OPENAI_API_KEY env var.');
  }
  return apiKey;
}

function ensureVideoDir(reportId: number): string {
  const dir = path.resolve(process.cwd(), 'server/data/carousel', String(reportId), 'video');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function setVideoStatus(reportId: number, status: string, error: string | null): void {
  db.prepare(
    `UPDATE dominical_reports SET video_status = ?, video_error = ?, video_status_updated_at = ? WHERE id = ?`
  ).run(status, error, new Date().toISOString(), reportId);
}

/** Modeled on generateLinkedInPost in jobs/generateDominical.ts, but for a short spoken script. */
async function generateVideoScript(selectedPosts: ScoredPost[], apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey });
  const newsList = selectedPosts
    .map((p, i) => `${i + 1}. "${p.title}"\n   ${getArticleContentSummary(p.slug)}`)
    .join('\n\n');

  const systemPrompt =
    'Eres el guionista de "El Dominical IA". El presentador es Robly, el robot mascota de Robles.AI, ' +
    'que narra en voz alta el resumen semanal de noticias de IA. Escribes en primera persona del plural ' +
    '("nuestro", "vemos", "esta semana cubrimos") porque los articulos son propios de robles.ai. ' +
    'El texto sera leido en voz alta por un sistema de texto-a-voz: debe sonar natural al hablarse.';

  const userPrompt = `Escribe un guion corto en espanol para que Robly, el robot presentador de "El Dominical IA", narre en voz alta el resumen semanal. Noticias seleccionadas de esta semana:

${newsList}

Reglas OBLIGATORIAS:
- Entre 55 y 70 palabras en total (el video debe durar unos 30 segundos, se breve y directo)
- Es un guion HABLADO: NO uses emojis, NO uses hashtags, NO uses markdown, NO incluyas URLs ni enlaces
- Empieza con un saludo breve y amigable presentandote por tu nombre, Robly, el robot de El Dominical IA
- Menciona cada noticia seleccionada con al menos un dato concreto (empresa, cifra o hallazgo especifico)
- Cierra invitando a leer mas en robles.ai (menciona solo la palabra, sin "www" ni "https")
- Usa oraciones cortas y claras, faciles de narrar con pausas naturales
- Tono cercano, amigable, ligeramente entusiasta

Devuelve SOLO el texto del guion, sin explicaciones, sin comillas, sin markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from GPT-4o video script generation');
  return content;
}

async function synthesizeNarration(script: string, apiKey: string, outputPath: string): Promise<void> {
  const openai = new OpenAI({ apiKey });
  const response = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'ballad',
    input: script,
    instructions: VOICE_INSTRUCTIONS,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

function getAudioDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const duration = data.format?.duration;
      if (!duration || !isFinite(duration)) return reject(new Error('Could not determine narration audio duration'));
      resolve(duration);
    });
  });
}

/**
 * Runs ffmpeg's silencedetect filter over the narration and inverts the
 * resulting silence windows to get the speech windows — used to gate the
 * robot's mouth so it only "talks" while there's actually audio playing.
 */
function detectSpeechIntervals(audioPath: string, totalDuration: number): Promise<Array<[number, number]>> {
  return new Promise((resolve, reject) => {
    const args = ['-i', audioPath, '-af', 'silencedetect=noise=-30dB:d=0.15', '-f', 'null', '-'];
    const proc = spawn(ffmpegInstaller.path, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', () => {
      const starts: number[] = [];
      const ends: number[] = [];
      const startRe = /silence_start:\s*([\d.]+)/g;
      const endRe = /silence_end:\s*([\d.]+)/g;
      let m: RegExpExecArray | null;
      while ((m = startRe.exec(stderr))) starts.push(parseFloat(m[1]));
      while ((m = endRe.exec(stderr))) ends.push(parseFloat(m[1]));

      const silences: Array<[number, number]> = starts.map((s, i) => [s, ends[i] ?? totalDuration]);

      const speech: Array<[number, number]> = [];
      let cursor = 0;
      for (const [s, e] of silences) {
        if (s > cursor) speech.push([cursor, s]);
        cursor = Math.max(cursor, e);
      }
      if (cursor < totalDuration) speech.push([cursor, totalDuration]);
      if (speech.length === 0) speech.push([0, totalDuration]);

      resolve(speech);
    });
  });
}

function isSpeaking(t: number, speechIntervals: Array<[number, number]>): boolean {
  return speechIntervals.some(([start, end]) => t >= start && t < end);
}

function splitIntoSentences(script: string): string[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [script.trim()];
}

interface CaptionWindow {
  text: string;
  start: number;
  end: number;
}

/**
 * Per-sentence durations proportional to character length, floored at
 * MIN_SENTENCE_SECONDS, then rescaled so the sum exactly equals the audio
 * duration (flooring short sentences can otherwise push the sum above the
 * real narration length).
 */
function buildCaptionWindows(sentences: string[], totalDuration: number): CaptionWindow[] {
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0) || 1;
  const raw = sentences.map((s) => Math.max(MIN_SENTENCE_SECONDS, totalDuration * (s.length / totalChars)));
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const scale = totalDuration / rawSum;

  const windows: CaptionWindow[] = [];
  let cursor = 0;
  for (let i = 0; i < sentences.length; i++) {
    const duration = raw[i] * scale;
    windows.push({ text: sentences[i], start: cursor, end: cursor + duration });
    cursor += duration;
  }
  return windows;
}

function findActiveCaptionWindow(t: number, windows: CaptionWindow[]): CaptionWindow | null {
  return windows.find((w) => t >= w.start && t < w.end) ?? null;
}

/**
 * Clamps each proportional-by-length caption window to the actual speech
 * coverage inside it (from the earliest to the latest overlapping speech
 * interval), instead of the fine-grained per-frame `isSpeaking` signal used
 * for the mouth. A sentence with several natural pauses (breaths, commas —
 * more common with an expressive voice like "ballad") still reports several
 * separate speech intervals, and gating caption visibility on that raw
 * signal made the whiteboard text blink on/off mid-sentence. Clamping instead
 * of gating keeps the caption visible continuously across its own sentence's
 * speaking span while still hiding it during real silence between sentences.
 */
function clampWindowsToSpeech(windows: CaptionWindow[], speechIntervals: Array<[number, number]>): CaptionWindow[] {
  return windows.map((w) => {
    const overlapping = speechIntervals.filter(([s, e]) => e > w.start && s < w.end);
    if (overlapping.length === 0) return w;
    const start = Math.max(w.start, Math.min(...overlapping.map(([s]) => s)));
    const end = Math.min(w.end, Math.max(...overlapping.map(([, e]) => e)));
    return { ...w, start, end };
  });
}

function muxVideo(framesDir: string, narrationPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(path.join(framesDir, 'frame-%05d.png'))
      .inputFPS(FRAME_RATE)
      .input(narrationPath)
      .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest']);

    command.on('error', (err: Error, _stdout: string | null, stderr: string | null) => {
      reject(new Error(`${err.message}${stderr ? `\n${stderr}` : ''}`));
    });
    command.on('end', () => resolve());
    command.save(outputPath);
  });
}

/**
 * Orchestrator — called un-awaited from the route handler (background job).
 */
export async function generateDominicalVideo(
  reportId: number,
  variant: RobotVariant = 'dominical'
): Promise<void> {
  const videoDir = ensureVideoDir(reportId);
  const framesDir = path.join(videoDir, 'frames');

  try {
    const report = db.prepare('SELECT selected_news FROM dominical_reports WHERE id = ?').get(reportId) as
      | { selected_news: string | null }
      | undefined;
    if (!report) throw new Error(`Report ${reportId} not found`);

    let selectedPosts: ScoredPost[] = [];
    try {
      selectedPosts = report.selected_news ? JSON.parse(report.selected_news) : [];
    } catch {
      selectedPosts = [];
    }
    if (selectedPosts.length === 0) throw new Error('No selected news available to generate a video script');

    const apiKey = getApiKey();

    console.log(`[DominicalVideoGen] Report ${reportId}: generating script...`);
    const script = await generateVideoScript(selectedPosts, apiKey);
    db.prepare('UPDATE dominical_reports SET video_script = ? WHERE id = ?').run(script, reportId);
    console.log(`[DominicalVideoGen] Report ${reportId}: script generated (${script.split(/\s+/).length} words)`);

    const narrationPath = path.join(videoDir, 'narration.mp3');
    await synthesizeNarration(script, apiKey, narrationPath);
    console.log(`[DominicalVideoGen] Report ${reportId}: TTS audio saved`);

    const totalDuration = await getAudioDurationSeconds(narrationPath);
    const speechIntervals = await detectSpeechIntervals(narrationPath, totalDuration);
    const sentences = splitIntoSentences(script);
    const captionWindows = clampWindowsToSpeech(buildCaptionWindows(sentences, totalDuration), speechIntervals);
    console.log(
      `[DominicalVideoGen] Report ${reportId}: audio ${totalDuration.toFixed(1)}s, ` +
        `${speechIntervals.length} speech interval(s), ${sentences.length} caption(s)`
    );

    // Fresh frames dir per generation
    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });

    const logoBuffer = await sharp(LOGO_PATH)
      .resize(LOGO_WIDTH, LOGO_HEIGHT, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const { width: frameWidth, height: frameHeight, scale } = getFrameDimensions(variant);
    const whiteboardZone = {
      x: Math.round(WHITEBOARD_TEXT_ZONE_NATIVE.x * scale),
      y: Math.round(WHITEBOARD_TEXT_ZONE_NATIVE.y * scale),
      width: Math.round(WHITEBOARD_TEXT_ZONE_NATIVE.width * scale),
      height: Math.round(WHITEBOARD_TEXT_ZONE_NATIVE.height * scale),
    };

    let backgroundBuffer: Buffer | null = null;
    try {
      backgroundBuffer = await generateVideoBackground(selectedPosts, apiKey, frameWidth, frameHeight);
      console.log(`[DominicalVideoGen] Report ${reportId}: AI background generated`);
    } catch (err) {
      console.warn(`[DominicalVideoGen] Report ${reportId}: background generation failed, using flat color`, err);
    }

    const totalFrames = Math.ceil(totalDuration * FRAME_RATE);
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / FRAME_RATE;
      const speaking = isSpeaking(t, speechIntervals);
      const pose = computeRobotPose(t, speaking, variant);
      const frameSvg = renderRobotFrameSvg(pose, variant);
      const robotBuffer = await sharp(Buffer.from(frameSvg)).resize(frameWidth, frameHeight).png().toBuffer();

      const composites: Array<{ input: Buffer; top: number; left: number }> = [
        { input: robotBuffer, top: 0, left: 0 },
      ];

      // Captions are shown for their (speech-clamped) window regardless of
      // the fine-grained per-frame `speaking` flag, which also reacts to
      // brief mid-sentence pauses — using it here made the caption blink on
      // and off within a single sentence. The clamped window bounds already
      // keep text hidden during real silence between sentences.
      const activeWindow = findActiveCaptionWindow(t, captionWindows);
      if (activeWindow) {
        if (variant !== 'dominical') {
          const progress = (t - activeWindow.start) / (activeWindow.end - activeWindow.start);
          composites.push({
            input: buildWhiteboardCaptionSvg(activeWindow.text, progress, whiteboardZone.width, whiteboardZone.height),
            top: whiteboardZone.y,
            left: whiteboardZone.x,
          });
        } else {
          composites.push({
            input: buildCaptionOverlaySvg(activeWindow.text),
            top: frameHeight - VIDEO_CAPTION_BAND_HEIGHT,
            left: 0,
          });
        }
      }
      composites.push({ input: logoBuffer, top: LOGO_TOP, left: LOGO_LEFT });

      const framePath = path.join(framesDir, `frame-${String(frame).padStart(5, '0')}.png`);
      const base = backgroundBuffer
        ? sharp(backgroundBuffer)
        : sharp({ create: { width: frameWidth, height: frameHeight, channels: 4, background: BACKGROUND_COLOR } });
      await base.composite(composites).png().toFile(framePath);
    }
    console.log(`[DominicalVideoGen] Report ${reportId}: ${totalFrames} frames rendered at ${frameWidth}x${frameHeight}`);

    const outputPath = path.join(videoDir, 'output.mp4');
    await muxVideo(framesDir, narrationPath, outputPath);
    console.log(`[DominicalVideoGen] Report ${reportId}: video muxed successfully`);

    // Cleanup frames now that the mux succeeded
    fs.rmSync(framesDir, { recursive: true, force: true });

    db.prepare(
      `UPDATE dominical_reports SET video_status = 'generated', video_url = ?, video_error = NULL, video_status_updated_at = ? WHERE id = ?`
    ).run(outputPath, new Date().toISOString(), reportId);
  } catch (err: any) {
    console.error(`[DominicalVideoGen] Report ${reportId} failed:`, err.message);
    setVideoStatus(reportId, 'failed', err.message || 'Unknown error');
  }
}
