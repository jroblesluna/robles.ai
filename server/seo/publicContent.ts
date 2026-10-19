import { STATIC_PAGES, staticPagePath, blogPagePath, schemaDate, type ContentLanguage } from '../../shared/seoPolicy.js';
import { PUBLIC_CONTACT, visibleTeamMembers } from '../../shared/publicContent.js';
import type { BlogPostData } from './types.js';

type Translations = Record<string, any>;
// Text, attributes and embedded JSON have separate escaping rules. No stored HTML is trusted.
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const tag = (name: string, text: unknown) => typeof text === 'string' && text ? `<${name}>${escape(text)}</${name}>` : '';
const paragraph = (text: unknown) => tag('p', text);
const link = (href: string, text: string) => `<a href="${escape(href)}">${escape(text)}</a>`;
const values = (value: unknown): any[] => value && typeof value === 'object' ? Object.values(value) : [];
const items = (value: unknown) => values(value).map(item => `<section>${tag('h3', item?.title)}${paragraph(item?.description ?? item?.desc)}${paragraph(item?.fullDescription?.overview)}</section>`).join('');
const section = (id: string, value: any) => value ? `<section id="${escape(id)}">${tag('h2', value.title)}${paragraph(value.subtitle)}${items(value.items)}${paragraph(value.footnote)}</section>` : '';
const demoCards = (demos: any[], lang: ContentLanguage, t: Translations, heading = 'h2') => demos.map(demo => `<section>${tag(heading, demo.title)}${paragraph(demo.description)}${demo.status === 'live' && typeof demo.href === 'string' && /^\/try-[a-z-]+$/.test(demo.href) ? link(staticPagePath(demo.href, lang), t.demosCatalog.cta_try) : paragraph(t.demosCatalog.badge_soon)}</section>`).join('');

/** A public, readable first response for every visitor, replaced by React on startup.
 * This is progressive enhancement, not hydration or bot-specific dynamic rendering.
 * Copy comes exclusively from the same locales and public post records as the SPA.
 */
export function publicDocument(body: string, lang: ContentLanguage, t: Translations): string {
  const nav = [['/', 'Robles.AI'], ['/get-started', t.landing.hero.cta], ['/demos', t.nav.demos], ['/blog', t.nav.blog], ['/careers', t.nav.careers]];
  return `<div class="container mx-auto px-4 py-8 max-w-5xl" data-public-document="true"><header><nav aria-label="${escape(t.nav.primaryLabel)}">${nav.map(([href, label]) => link(staticPagePath(href, lang), label)).join(' · ')}</nav></header><main id="main-content" class="prose max-w-none">${body}</main><footer>${link(staticPagePath('/#contact', lang), t.nav.contact)}</footer></div>`;
}

export function renderStaticContent(path: string, lang: ContentLanguage, t: Translations, url: URL): string {
  let body = '';
  if (path === '/') {
    body = `${tag('h1', t.hero.title)}${paragraph(t.hero.subtitle)}${link(staticPagePath('/get-started', lang), t.hero.cta3)}${section('features', t.features)}${section('solutions', t.solutions)}<section id="demos">${tag('h2', t.demosCatalog.title)}${paragraph(t.demosCatalog.subtitle)}${demoCards(values(t.demosCatalog.items).slice(0,8), lang, t, 'h3')}</section>${section('case-studies', t.caseStudies)}${section('courses', t.courses)}<section id="about">${tag('h2', t.team.title)}${paragraph(t.team.subtitle)}${visibleTeamMembers<any>(values(t.team.members)).map(member => `<section>${tag('h3', member.name)}${paragraph(member.position)}${paragraph(member.bio)}</section>`).join('')}</section><section id="contact">${tag('h2', t.contact.title)}${paragraph(t.contact.subtitle)}${link(`mailto:${PUBLIC_CONTACT.email}`, PUBLIC_CONTACT.email)} ${link(PUBLIC_CONTACT.phoneHref, PUBLIC_CONTACT.phone)}${paragraph(PUBLIC_CONTACT.street)}${paragraph(PUBLIC_CONTACT.city)}</section>`;
  } else if (path === '/get-started') {
    const p = t.landing;
    body = `${tag('h1', `${p.hero.title} ${p.hero.titleHighlight}`)}${paragraph(p.hero.subtitle)}${link(staticPagePath('/diagnostico-ia', lang), p.hero.quizCta)}${section('services', p.services)}${section('technologies', p.technologies)}${tag('h2', p.howWeWork.title)}${paragraph(p.howWeWork.subtitle)}${items(p.steps)}${[1,2,3,4].map(n => paragraph(p.howWeWork[`step${n}Detail`])).join('')}${section('experience', p.experience)}${tag('h2', p.diagnostico.title)}${paragraph(p.diagnostico.subtitle)}`;
  } else if (path === '/careers' || path === '/apply') {
    const jobs = path === '/apply' ? t.careers.jobs.filter((job: any) => job.id === url.searchParams.get('job')) : t.careers.jobs;
    body = `${tag('h1', path === '/careers' ? t.careers.title : t.careers.apply)}${paragraph(t.careers.subtitle)}${jobs.map((job: any) => `<section>${tag('h2', job.title)}${paragraph(job.description)}${paragraph(job.fullDescription?.overview)}${tag('h3', t.careers.responsibilities)}<ul>${(job.fullDescription?.responsibilities ?? []).map((s: string) => tag('li', s)).join('')}</ul>${tag('h3', t.careers.requirements)}<ul>${(job.fullDescription?.requirements ?? []).map((s: string) => tag('li', s)).join('')}</ul>${link(staticPagePath(`/apply?job=${encodeURIComponent(job.id)}`, lang), t.careers.apply)}</section>`).join('')}`;
  } else if (path === '/diagnostico-ia') {
    body = `${tag('h1', t.quiz.intro.title)}${paragraph(t.quiz.intro.subtitle)}${paragraph(t.quiz.intro.disclaimer)}`;
  } else if (path === '/demos') {
    body = `${tag('h1', t.demosCatalog.title)}${paragraph(t.demosCatalog.subtitle)}${demoCards(values(t.demosCatalog.items), lang, t)}`;
  } else {
    const key = path === '/try-object-detection' ? 'try-object' : path.slice(1);
    const demo = t[key] ?? {};
    const seo = t.seo[STATIC_PAGES[path]];
    body = `${tag('h1', demo.title ?? demo.onboarding_title ?? seo?.title)}${paragraph(demo.description ?? demo.subtitle ?? demo.onboarding_subtitle ?? seo?.description)}${paragraph(demo.coming_soon)}${tag('h2', demo.how_title)}${[1,2,3].map(n => `${tag('h3', demo[`how_step${n}_title`])}${paragraph(demo[`how_step${n}_desc`])}`).join('')}${paragraph(demo.disclaimer)}`;
  }
  return publicDocument(body, lang, t);
}

export function renderArticleContent(post: BlogPostData, lang: ContentLanguage, t: Translations): string {
  const translation = post.translations[lang];
  const published = schemaDate(post.date);
  const sources = (post.sources ?? []).flatMap(source => {
    // Do not turn malformed or executable stored URLs into active links.
    try { const url = new URL(source.url); return /^https?:$/.test(url.protocol) ? [`<li>${link(url.href, source.title || source.source)}</li>`] : []; } catch { return []; }
  }).join('');
  const body = `<article>${tag('h1', translation.title)}${published ? `<time datetime="${escape(published)}">${escape(published.slice(0,10))}</time>` : ''}${paragraph(translation.excerpt)}${translation.content.map(block => `<section>${tag('h2', block.heading)}${block.body.split(/\n\s*\n|\n/).filter(Boolean).map(paragraph).join('')}</section>`).join('')}${sources ? `<ul>${sources}</ul>` : ''}</article>${link(staticPagePath('/blog', lang), t.nav.blog)}`;
  return publicDocument(body, lang, t);
}

export function renderArchiveContent(posts: BlogPostData[], lang: ContentLanguage, t: Translations, page: number, total: number): string {
  const cards = posts.map(post => `<article><h2>${link(blogPagePath(post.translations.en.slug, post.translations.es.slug, lang), post.translations[lang].title)}</h2>${paragraph(post.translations[lang].excerpt)}</article>`).join('');
  const pages = Math.max(1, Math.ceil(total / 30));
  const paging = [page > 1 ? link(staticPagePath('/blog', lang, page - 1), '←') : '', page < pages ? link(staticPagePath('/blog', lang, page + 1), '→') : ''].join(' ');
  return publicDocument(`${tag('h1', t.nav.blog)}${paragraph(t.seo.blog.description)}${cards}<nav aria-label="${lang === 'es' ? 'Páginas' : 'Pages'}">${paging}</nav>`, lang, t);
}

/** Keep the head-only metadata injector independent; the template root is controlled. */
export function injectPublicContent(html: string, content: string, post?: BlogPostData, hydrate = false): string {
  const root = /(<div\b[^>]*\bid=["']root["'][^>]*>)\s*(<\/div>)/;
  if (!root.test(html)) throw new Error('Public template root is missing');
  let result = html.replace(root, (_match, start, end) => (hydrate ? start.replace(/>$/, ' data-render-mode="hydrate" data-public-document="true">') : start) + content + end);
  if (post) {
    // Only the public article shape is serialized; never forward arbitrary record fields.
    const { slug, date, image, editorId, categories, keywords, translations, sources } = post;
    const data = JSON.stringify({ slug, date, image, editorId, categories, keywords, translations, sources }).replace(/</g, '\\u003c');
    result = result.replace('</body>', () => `<script id="public-post" type="application/json">${data}</script></body>`);
  }
  return result;
}
