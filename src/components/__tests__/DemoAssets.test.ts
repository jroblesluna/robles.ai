import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XMLValidator } from 'fast-xml-parser';
import { expect, it } from 'vitest';
import en from '@/i18n/locales/en/translation.json';
import es from '@/i18n/locales/es/translation.json';
import { DEMO_PHOTOS } from '@/components/demo/DemoVisualPreview';

it.each([['en', en], ['es', es]] as const)('ships a valid, self-contained %s poster for every live and roadmap card', (lang, copy) => {
  for (const item of copy.demosCatalog.items) {
    const svg = readFileSync(resolve('public/demo-previews', `${item.id}-${lang}.svg`), 'utf8');
    expect(XMLValidator.validate(svg), item.id).toBe(true);
    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).not.toMatch(/<script|<foreignObject|https?:\/\/(?!www.w3.org)/);
    expect(svg).toContain(lang === 'es' ? 'Ejemplo ilustrativo' : 'Illustrative example');
  }
  const mp4 = readFileSync(resolve('public/demo-previews', `invoice-preview-${lang}.mp4`));
  expect(mp4.subarray(4, 8).toString()).toBe('ftyp');
  expect(mp4.indexOf(Buffer.from('moov'))).toBeLessThan(mp4.indexOf(Buffer.from('mdat')));
  expect(mp4.length).toBeLessThan(150000);
});

it('ships a distinct responsive generated photo for every live and roadmap card', () => {
  expect(Object.keys(DEMO_PHOTOS).sort()).toEqual(en.demosCatalog.items.map(item => item.id).sort());
  expect(new Set(Object.values(DEMO_PHOTOS)).size).toBe(13);
  for (const name of Object.values(DEMO_PHOTOS)) {
    for (const width of [480, 960]) {
      const image = readFileSync(resolve('public/demo-previews', `${name}-${width}.webp`));
      expect(image.subarray(0, 4).toString()).toBe('RIFF');
      expect(image.subarray(8, 12).toString()).toBe('WEBP');
      expect(image.length, `${name}-${width}`).toBeLessThan(width === 480 ? 50000 : 150000);
    }
  }
});

it('provides one bounded Firefly reference frame and individual prompt per catalog card', async () => {
  const sharp = (await import('sharp')).default;
  const base = resolve('creative/firefly-demo-clips');
  const manifest = JSON.parse(readFileSync(resolve(base, 'manifest.json'), 'utf8'));
  expect(manifest.demos.map((demo: { id: string }) => demo.id).sort()).toEqual(en.demosCatalog.items.map(item => item.id).sort());
  expect(new Set(manifest.demos.map((demo: { prompt: string }) => demo.prompt)).size).toBe(13);
  for (const demo of manifest.demos) {
    const frame = readFileSync(resolve(base, demo.firstFrame));
    const metadata = await sharp(frame).metadata();
    expect(metadata.width).toBe(1280); expect(metadata.height).toBe(720);
    expect(metadata.format).toBe('jpeg'); expect(frame.length).toBeLessThan(100000);
    expect(readFileSync(resolve(base, demo.promptFile), 'utf8').trim()).toBe(demo.prompt);
    expect(demo.prompt).toContain('five-second');
    expect(demo.prompt).toContain('central 960x720 safe area');
    expect(demo.videoStatus).toBe('awaiting_firefly_generation');
  }
  expect(manifest.delivery.maxBytes).toBe(750000);
});
