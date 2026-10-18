/** The server embeds only a public article, so direct visits need no second content fetch.
 * Match the requested slug on every read to prevent stale data during SPA navigation.
 */
export function initialPublicPost<T extends { translations: { en: { slug: string }; es: { slug: string } } }>(slug?: string): T | null {
  if (typeof document === 'undefined' || !slug) return null;
  try {
    const post = JSON.parse(document.getElementById('public-post')?.textContent ?? 'null');
    return post?.translations?.en?.slug === slug || post?.translations?.es?.slug === slug ? post as T : null;
  } catch { return null; }
}
