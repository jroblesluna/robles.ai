import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";

interface Post {
  slug: string;
  date: string;
  image: string;
  editorId: number;
  translations: {
    en: { title: string; excerpt: string; content: { subtitle: string; body: string }[] };
    es: { title: string; excerpt: string; content: { subtitle: string; body: string }[] };
  };
}

interface Editor {
  id: number;
  name: string;
  signature: string;
}

export default function BlogPost() {
  const { i18n } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [editors, setEditors] = useState<Editor[]>([]);
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  useEffect(() => {
    if (slug) {
      fetch(`/api/blog/${slug}`)
        .then((res) => res.json())
        .then((data) => setPost(data));
    }
    fetch("/api/editors")
      .then((res) => res.json())
      .then((data) => setEditors(data.editors));
  }, [slug]);

  if (!post) return <div className="p-6">Loading...</div>;

  const translation = post.translations[i18n.language as "en" | "es"] || post.translations.en;
  const editor = editors.find((e) => e.id === post.editorId);

  const wordCount = translation.content.reduce((sum, block) => sum + block.body.split(/\s+/).length, 0);
  const readingTimeMinutes = Math.ceil(wordCount / 200); // Assuming 200 words per minute

  return (
    <div className="flex flex-col">
      {/* HERO SECTION */}
      <div className="relative w-full h-72 md:h-96 overflow-hidden">
        {post.image && (
          <img
            src={post.image}
            alt={translation.title}
            className="absolute inset-0 w-full h-full object-cover brightness-75"
          />
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <h1 className="text-white text-3xl md:text-5xl font-bold text-center px-4">
            {translation.title}
          </h1>
        </div>
      </div>

      {/* POST INFO */}
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex flex-col items-start text-center text-gray-500 text-sm mb-6">
          <p>
            {new Date(post.date).toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {editor && (
            <div className="flex items-center gap-4 mt-2">
              <img src={`/avatars/${editor.id}-headshot.png`} alt={editor.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="text-left">
                <p className="font-semibold">{editor.name}</p>
                <p className="text-xs italic">{editor.signature}</p>
              </div>
            </div>
          )}
          <p className="mt-2">{wordCount} words · {readingTimeMinutes} min read</p>
        </div>

        {/* POST CONTENT */}
        <article className="prose prose-lg max-w-none">
          {translation.content.map((block, idx) => (
            <section key={idx} className="mb-8">
              {block.subtitle && <h2>{block.subtitle}</h2>}
              <p>{block.body}</p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}