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
