import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

interface Post {
  slug: string;
  date: string;
  image?: string;
  editorId: number;
  translations: {
    en: { title: string; excerpt: string; content: { heading: string; body: string }[] };
    es: { title: string; excerpt: string; content: { heading: string; body: string }[] };
  };
}

interface Editor {
  id: number;
  name: string;
  signature: string;
}

function extractDateTimeFromSlug(slug: string): Date {
  const isoString = slug.slice(0, 19).replace(/-/g, ':').replace(/^(\d{4}):(\d{2}):(\d{2}):/, '$1-$2-$3T').replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(isoString);
}

function formatDateWithTimeZone(date: Date, language: "en" | "es"): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

export default function BlogList() {
  const { i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/blog").then((res) => res.json()),
      fetch("/api/editors").then((res) => res.json())
    ]).then(([postsData, editorsData]) => {
      const validPosts = postsData.filter((post: Post) => post && post.slug); // ✨ solo posts válidos
      const sortedPosts = validPosts.sort((a: Post, b: Post) => {
        const dateA = new Date(extractDateTimeFromSlug(a.slug)).getTime();
        const dateB = new Date(extractDateTimeFromSlug(b.slug)).getTime();
        return dateB - dateA;
      });
      setPosts(sortedPosts);
      setEditors(editorsData.editors);
    });
  }, []);

  return (
    <div className="container mx-auto p-6">
      {/* HERO */}
      <div className="relative w-full py-8 md:py-12 mb-4 md:mb-12 rounded-lg shadow-md overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
        <img
          src="/avatars/defaultPostHeader-alt-1.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover blur-sm brightness-50"
        />
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 opacity-30"></div>

        {/* Texto */}
        <div className="relative container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-sm tracking-tight">
            {i18n.language === "es" ? "Noticias en Robles.AI" : "Robles.AI News Blog"}
          </h1>
          <p className="mt-1 md:mt-2 text-white text-sm md:text-base opacity-90 max-w-md md:max-w-xl mx-auto">
            {i18n.language === "es"
              ? "Explora tendencias, avances y análisis de IA de última generación."
              : "Explore cutting-edge AI trends, breakthroughs, and insights."}
          </p>
        </div>
      </div>

      {/* POSTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {posts.map((post) => {
          const translation = post.translations[i18n.language as "en" | "es"] || post.translations.en;
          const postDate = extractDateTimeFromSlug(post.slug);
          const formattedDate = formatDateWithTimeZone(postDate, i18n.language as "en" | "es");
          const editor = editors.find((e) => e.id === post.editorId);

          return (
            <Link
              href={`/blog/${post.slug}`}
              key={post.slug}
className="block rounded-lg border border-white hover:border-purple-400 hover:-mt-2 hover:mb-2 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden bg-white p-4"            >
              {post.image && (
                <img
                  src={post.image}
                  alt={translation.title}
                  className="w-full h-36 md:h-48 object-cover mb-4 rounded-md"
                />
              )}
              <div className="flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold mb-2 text-gray-800">{translation.title}</h2>
                  <p className="text-sm text-gray-500 mb-4">{translation.excerpt}</p>
                </div>

                {editor && (
                  <div className="flex items-center gap-3 mt-auto">
                    <img
                      src={`/avatars/${editor.id}-headshot.png`}
                      alt={editor.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex flex-col leading-tight">
                      <p className="text-xs font-semibold text-gray-700">{i18n.language === "es" ? `Por ${editor.name}` : `By ${editor.name}`}</p>
                      <p className="text-[11px] text-gray-500">{formattedDate}</p>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}