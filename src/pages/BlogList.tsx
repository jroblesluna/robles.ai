import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

interface Post {
  slug: string;
  date: string;
  image?: string;
  translations: {
    en: { title: string; content: string };
    es: { title: string; content: string };
  };
}

export default function BlogList() {
  const { i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetch("/api/blog")
      .then((res) => res.json())
      .then((data) => setPosts(data));
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Blog</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const translation = post.translations[i18n.language as "en" | "es"] || post.translations.en;

          return (
            <Link href={`/blog/${post.slug}`} key={post.slug}>
              <a className="block rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden bg-white">
                {post.image && (
                  <img
                    src={post.image}
                    alt={translation.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{translation.title}</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    {new Date(post.date).toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-gray-700 line-clamp-3">
                    {translation.content.replace(/(<([^>]+)>)/gi, "").slice(0, 150)}...
                  </p>
                </div>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}