import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * Sets document title and meta description based on current route and language.
 * BlogPost handles its own SEO, so it's excluded here.
 */
export function useSEO() {
  const [location] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Skip for blog posts (they handle their own title)
    if (location.startsWith("/blog/") && location !== "/blog") return;

    const title = t(`seo.${getRouteKey(location)}.title`);
    const description = t(`seo.${getRouteKey(location)}.description`);

    document.title = title;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;

    // Update OG tags
    updateMeta("og:title", title);
    updateMeta("og:description", description);
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
  }, [location, t]);
}

function getRouteKey(path: string): string {
  if (path === "/") return "home";
  if (path === "/get-started") return "landing";
  if (path === "/careers") return "careers";
  if (path === "/apply") return "apply";
  if (path === "/blog") return "blog";
  if (path.startsWith("/try-")) return "demos";
  return "home";
}

function updateMeta(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
  }
  if (meta) {
    meta.content = content;
  }
}
