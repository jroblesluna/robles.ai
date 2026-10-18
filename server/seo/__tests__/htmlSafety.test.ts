// @vitest-environment node
import { expect, it } from 'vitest';
import { injectMeta } from '../htmlInjector';
import { buildStaticMeta } from '../metaBuilders';
it('escapes JSON-LD script terminators while preserving the original schema string', () => {
  const meta = buildStaticMeta('/', 'es', {});
  const value = '</script><script>alert(1)</script>';
  meta.jsonLd = [{ '@type': 'WebPage', name: value }];
  const html = injectMeta('<html lang="en"><head><title>old</title></head><body><div id="root"></div></body></html>', meta);
  const script = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1];
  expect(script).not.toContain('</script>');
  expect(JSON.parse(script).name).toBe(value);
  expect(html).toContain('lang="es"');
  expect(html).toContain('<body><div id="root"></div></body>');
});
