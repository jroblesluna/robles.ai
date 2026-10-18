import { afterEach, describe, expect, it } from 'vitest';
import { initialPublicPost } from '../publicPost';
afterEach(() => { document.body.innerHTML = ''; });
describe('initial public article', () => {
  it('accepts only the current article and supports both translated slugs', () => {
    const post = { translations: { en: { slug: 'english' }, es: { slug: 'espanol' } } };
    const script = document.createElement('script');
    script.id = 'public-post'; script.type = 'application/json'; script.textContent = JSON.stringify(post);
    document.body.append(script);
    expect(initialPublicPost('english')).toEqual(post);
    expect(initialPublicPost('espanol')).toEqual(post);
    expect(initialPublicPost('another')).toBeNull();
  });
  it('tolerates missing or malformed bootstrap data', () => {
    expect(initialPublicPost('test')).toBeNull();
    document.body.innerHTML = '<script id="public-post" type="application/json">invalid</script>';
    expect(initialPublicPost('test')).toBeNull();
  });
});
