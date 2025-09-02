import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'wouter';

interface Post {
  slug: string;
  date: string;
  image: string;
  editorId: number;
  categories: string[];
  keywords: string[];
  translations: {
    en: {
      slug: string;
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
    es: {
      slug: string;
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
  };
  sources: { title: string; url: string; source: string; urlToImage?: string }[];
  stats?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface Editor {
  id: number;
  name: string;
  signature: string;
}

function splitIntoParagraphs(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (currentParagraph.split(/\s+/).length >= 50) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = trimmed;
    } else {
      currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
    }
  }
  if (currentParagraph) {
    paragraphs.push(currentParagraph.trim());
  }
  return paragraphs;
}

// Extrae y convierte la fecha del slug tipo YYYY-MM-DD-HH-MM-SS
function extractDateTimeFromSlug(slug: string): Date {
  const slugDateTime = slug
    .slice(0, 19)
    .replace(/-/g, ':')
    .replace(/^(\d{4}):(\d{2}):(\d{2}):/, '$1-$2-$3T')
    .replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(slugDateTime);
}

function formatDateWithTimeZone(date: Date, language: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export default function BlogPost() {
  const { i18n } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [slugWeb, setSlugWeb] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const pathname = url.pathname;
      const parts = pathname.split('/');
      setSlugWeb(parts.pop() || '');
    }
  }, []);

  useEffect(() => {
    if (!post) {
      window.location.href = '/not-found'; // 👈 redirige a tu ruta 404
      return;
    }

    // Genera URLs en ambos idiomas

    // Limpia versiones anteriores
    document
      .querySelectorAll("link[rel='canonical'], link[rel='alternate']")
      .forEach((el) => el.remove());

    let lenguage_page = post.translations.es?.slug == slugWeb ? 'es' : 'en';

    // Canonical dinámico según idioma activo
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `https://robles.ai/blog/${slugWeb}?lang=${lenguage_page}`;
    document.head.appendChild(canonical);

    // Alternate en
    const altEn = document.createElement('link');
    altEn.rel = 'alternate';
    altEn.hreflang = 'en';
    altEn.href = `https://robles.ai/blog/${post.translations.en?.slug}?lang=en`;
    document.head.appendChild(altEn);

    // Alternate es
    const altEs = document.createElement('link');
    altEs.rel = 'alternate';
    altEs.hreflang = 'es';
    altEs.href = `https://robles.ai/blog/${post.translations.es?.slug}?lang=es`;
    document.head.appendChild(altEs);

    // // x-default
    // const altDefault = document.createElement('link');
    // altDefault.rel = 'alternate';
    // altDefault.hreflang = 'x-default';
    // altDefault.href = urls.en; // o puedes usar la home en inglés como "default"
    // document.head.appendChild(altDefault);
  }, [post, i18n.language]);

  useEffect(() => {
    if (slug) {
      fetch(`/api/blog/${slug}`)
        .then((res) => res.json())
        .then((data) => setPost(data));
    }
    fetch('/api/editors')
      .then((res) => res.json())
      .then((data) => setEditors(data.editors));

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug]);

  if (!post) return <div className="p-6">Loading...</div>;

  const translation = post.translations[i18n.language as 'en' | 'es'] || post.translations.en;
  const editor = editors.find((e) => e.id === post.editorId);

  const postDate = extractDateTimeFromSlug(post.slug);

  const wordCount = translation.content.reduce(
    (sum, block) => sum + block.body.split(/\s+/).length,
    0
  );
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return (
    <div className="flex flex-col relative">
      {/* HERO */}
      <div className="relative w-full h-72 md:h-96 overflow-hidden">
        {(() => {
          const heroImage =
            '/avatars/defaultPostHeader' + (editor ? `-${editor.id}` : '') + '.png';

          return (
            <img
              src={heroImage}
              alt={translation.title}
              className="absolute inset-0 w-full h-full object-cover brightness-75"
            />
          );
        })()}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <h1 className="text-white text-3xl md:text-5xl font-bold text-center px-4">
            {translation.title}
          </h1>
        </div>
      </div>

      {/* POST INFO */}
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between text-gray-500 text-sm mb-8 00">
          <div className="flex items-center gap-4 max-sm:flex-col max-sm:w-full">
            <img
              src={`/avatars/antonio-robles-headshot.png`}
              alt="Antonio Robles"
              className="w-14 h-14 rounded-full object-cover max-sm:w-28 max-sm:h-28"
            />
            <div className="text-left">
              <p className="font-semibold text-gray-800  ">
                ✍️ {i18n.language === 'es' ? 'Publicado por' : 'Published By'}:
              </p>
              <p className="font-semibold text-gray-800">Antonio Robles</p>
              <p className="text-xs italic text-gray-400">We Build AI That Earns Trust.</p>
            </div>

            {editor && (
              <>
                <img
                  src={`/avatars/${editor.id}-headshot.png`}
                  alt={editor.name}
                  className="w-14 h-14 rounded-full object-cover max-sm:w-28 max-sm:h-28"
                />
                <div className="text-left">
                  <p className="font-semibold text-gray-800">
                    🤖 {i18n.language === 'es' ? 'Asistente AI' : 'AI Assistant'}:
                  </p>
                  <p className="font-semibold text-gray-800">{editor.name}</p>
                  <p className="text-xs italic text-gray-400">{editor.signature}</p>
                </div>
              </>
            )}
          </div>
          <div className="text-right mt-4 md:mt-0">
            <p>{formatDateWithTimeZone(postDate, i18n.language as 'en' | 'es')}</p>
            <p>
              {wordCount} words · {readingTimeMinutes} min read
            </p>
          </div>
        </div>

        {/* CATEGORIES */}
        {post.categories?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">
              {i18n.language === 'es' ? 'Categorías' : 'Categories'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {post.categories.map((category, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TOC */}
        {translation.content.length > 1 && (
          <div id="toc" className="mb-12 bg-gray-50 p-6 rounded-lg shadow-sm scroll-mt-20">
            <h2 className="text-xl font-bold mb-4">
              {i18n.language === 'es' ? 'Tabla de Contenido' : 'Table of Contents'}
            </h2>
            <ul className="list-disc list-inside text-sm space-y-2">
              {translation.content.map(
                (block, idx) =>
                  block.heading && (
                    <li key={idx}>
                      <a href={`#section-${idx}`} className="text-blue-600 hover:underline">
                        {block.heading}
                      </a>
                    </li>
                  )
              )}
            </ul>
          </div>
        )}

        {/* POST CONTENT */}
        <article className="prose prose-lg max-w-none">
          {translation.content.map((block, idx) => (
            <section key={idx} className="mb-8">
              {block.heading && (
                <h2
                  id={`section-${idx}`}
                  className="scroll-mt-20 relative italic mb-2 font-bold text-gray-800"
                >
                  {block.heading}
                </h2>
              )}
              {splitIntoParagraphs(block.body).map((paragraph, pidx) => (
                <p key={pidx}>{paragraph}</p>
              ))}
              {(translation.content.length || -1) == idx + 1 && (
                <div className="mt-6">
                  <a
                    href="#toc"
                    className="text-blue-500 text-sm hover:underline inline-flex items-center"
                  >
                    ↑{' '}
                    {i18n.language === 'es' ? 'Volver al índice' : 'Back to Table of Contents'}
                  </a>
                </div>
              )}
            </section>
          ))}
        </article>

        {/* KEYWORDS */}
        {post.keywords?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">
              {i18n.language === 'es' ? 'Palabras clave' : 'Keywords'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {post.keywords.map((keyword, idx) => (
                <span key={idx} className="text-sm text-blue-500">
                  #{keyword.replace(/\s+/g, '')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SOURCES */}
        {post.sources?.length > 0 && (
          <div className="mt-12 bg-gray-100 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">
              {i18n.language === 'es' ? 'Fuentes' : 'Sources'}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              {post.sources.map((source, idx) => (
                <li key={idx}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {source.title} ({source.source})
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* STATS */}
        {post.stats && (
          <div className="mt-6 text-xs text-gray-400 text-center">
            {i18n.language === 'es'
              ? `Tokens usados: Prompt ${post.stats.prompt_tokens}, Respuesta ${post.stats.completion_tokens}, Total ${post.stats.total_tokens}`
              : `Tokens used: Prompt ${post.stats.prompt_tokens}, Completion ${post.stats.completion_tokens}, Total ${post.stats.total_tokens}`}
          </div>
        )}
      </div>

      {/* BACK TO TOP BUTTON */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 ${
          showScrollTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        ↑
      </button>
    </div>
  );
}
