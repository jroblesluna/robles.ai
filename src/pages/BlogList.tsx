// Enhanced BlogList.tsx with scroll pagination, filters, search and dropdown

import { useEffect, useState, useRef, useCallback } from "react";
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
  specialty: string;
  colorPalette: string[];
}

function extractDateTimeFromSlug(slug: string): Date {
  const isoString = slug.slice(0, 19).replace(/-/g, ':').replace(/^([\d]{4}):([\d]{2}):([\d]{2}):/, '$1-$2-$3T').replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(isoString);
}

function formatDateWithTimeZone(date: Date, language: "en" | "es"): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  }).format(date);
}

export default function BlogList() {
  const { i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editorFilter, setEditorFilter] = useState<number | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasMore]
  );

  useEffect(() => {
    fetch("/api/editors").then(res => res.json()).then(data => setEditors(data.editors));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({ page: page.toString(), limit: "9" });
    if (editorFilter) query.append("editorId", editorFilter.toString());

    fetch(`/api/blog?${query.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPosts(prev => [...prev, ...data.posts]);
        setHasMore(data.posts.length > 0);
      });
  }, [page, editorFilter]);

  function isColorLight(hex: string): boolean {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160; // Ajusta este umbral si es necesario
  }

  return (
    <div className="container mx-auto p-6">
      {/* Filters */}
      {/* Cool horizontal scrollable editor selector */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="text-lg text-gray-500">{i18n.language === "es" ? "Filtrar por" : "Filter by"}</span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-lg bg-gray-50 text-gray-500 hover:text-blue-700 rounded-md hover:bg-blue-50 transition duration-300 shadow-md"
        >
          <span>
            {editorFilter === null
              ? (i18n.language === "es" ? "Todos los temas" : "All topics")
              : editors.find((e) => e.id === editorFilter)?.specialty || "Editor"}
          </span>
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
        </button>
      </div>

      {/* POSTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {posts.map((post, index) => {
          const translation = post.translations[i18n.language as "en" | "es"] || post.translations.en;
          const postDate = extractDateTimeFromSlug(post.slug);
          const formattedDate = formatDateWithTimeZone(postDate, i18n.language as "en" | "es");
          const editor = editors.find((e) => e.id === post.editorId);
          const bgColor = editor?.colorPalette?.[0] ?? "#cccccc"; // Fallback color
          const textColor = isColorLight(bgColor) ? "#000000" : "#FFFFFF";

          const isLast = index === posts.length - 1;
          return (
            <div ref={isLast ? lastPostRef : null} key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="h-full block rounded-lg border border-white hover:border-purple-400 hover:-mt-2 hover:mb-2 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden bg-white p-4"
              >
                
                <div className="flex flex-col justify-between h-full">
                  <div>
                    {editor?.specialty && editor?.colorPalette && (
                      <span
                        className="inline-block mb-2 px-2 py-1 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                        }}
                      >
                        {editor.specialty}
                      </span>
                    )}
                    <h2 className="text-lg md:text-xl font-semibold mb-2 text-gray-800">{translation.title}</h2>
                    <p className="text-sm text-gray-500 mb-4">{translation.excerpt}</p>
                  </div>
                  {editor && (
                    <div className="flex items-center gap-3 mt-auto">

                      <div className="flex flex-col leading-tight">
                        <p className="text-xs font-semibold text-gray-700">
                          ✍️ {i18n.language === "es" ? `Publicado por` : `Published By`}: Antonio Robles
                        </p>
                        <p className="text-xs font-semibold text-gray-700">
                          🤖 {i18n.language === "es" ? `Asistente IA` : `AI Assistant`}: {editor.name}
                        </p>
                        <p className="text-[11px] text-gray-500">{formattedDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          );
        })}


      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{i18n.language === "es" ? "Selecciona un tema" : "Choose a topic"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-red-500 text-xl font-bold">&times;</button>
            </div>
            <button
              onClick={() => {
                if (editorFilter === null) {
                  setIsModalOpen(false); // Ya está en "Todos los temas", no hacer nada más
                  return;
                }
                setEditorFilter(null);
                setPage(1);
                setPosts([]);
                setIsModalOpen(false);
              }}
              className="w-full text-left flex items-center gap-3 p-3 mb-2 rounded-lg hover:bg-gray-100 transition bg-blue-50 text-blue-700 font-medium"
            >
              {i18n.language === "es" ? "Todos los temas" : "All topics"}
            </button>
            {editors.map(editor => (
              <button
                key={editor.id}
                onClick={() => {
                  if (editorFilter === editor.id) {
                    setIsModalOpen(false); // Ya está seleccionado, no repetir
                    return;
                  }
                  setEditorFilter(editor.id);
                  setPage(1);
                  setPosts([]);
                  setIsModalOpen(false);
                }}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition duration-50 ${editorFilter === editor.id ? "bg-blue-100" : ""}`}
              >
                <img
                  src={`/avatars/${editor.id}-headshot.png`}
                  alt={editor.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-sm">{editor.specialty}</p>
                  <p className="text-xs text-gray-500">{editor.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
