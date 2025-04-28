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
      {/* HERO HEADER */}
      <div className="relative w-full h-40 md:h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-center mb-12 rounded-lg shadow-md overflow-hidden">
        <div className="px-6">
          <h1 className="text-white text-3xl md:text-5xl font-bold">
            {i18n.language === "es" ? "Noticias en Robles.AI" : "Robles.AI News Blog"}
          </h1>
          <p className="text-white text-sm md:text-base mt-2 opacity-80">
            {i18n.language === "es"
              ? "Explora artículos, tendencias y noticias de vanguardia en Inteligencia Artificial."
              : "Explore cutting-edge AI articles, trends, and insights."}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const translation = post.translations[i18n.language as "en" | "es"] || post.translations.en;
          const postDate = extractDateTimeFromSlug(post.slug);
          const formattedDate = formatDateWithTimeZone(postDate, i18n.language as "en" | "es");
          const editor = editors.find((e) => e.id === post.editorId);

          return (
            <Link
              href={`/blog/${post.slug}`}
              key={post.slug}
              className="block rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden bg-white"
            >
              {post.image && (
                <img
                  src={post.image}
                  alt={translation.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{translation.title}</h2>
                  <p className="text-sm text-gray-500 mb-2">{formattedDate}</p>
                  <p className="text-gray-700 text-sm line-clamp-3 mb-4">{translation.excerpt}</p>
                </div>

                {editor ? (
                  <div className="flex items-center gap-2 mt-auto">
                    <img
                      src={`/avatars/${editor.id}-headshot.png`}
                      alt={editor.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <p className="text-xs text-gray-600">
                      {i18n.language === "es" ? "Por" : "By"} {editor.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-auto">
                    {i18n.language === "es" ? "Autor desconocido" : "Unknown editor"}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}