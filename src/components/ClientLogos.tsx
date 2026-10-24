import { CLIENT_LOGOS } from "@shared/publicContent";
import { useTranslation } from "react-i18next";

interface ClientLogosProps {
  /** "dark" for the landing's dark sections, "light" for the home page. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * Client logo wall. Logos sit on white tiles so every brand keeps its own colors on both
 * light and dark backgrounds. Shown in grayscale until hover/focus to keep the strip calm.
 */
export default function ClientLogos({ tone = "light", className = "" }: ClientLogosProps) {
  const { t } = useTranslation();
  const dark = tone === "dark";

  return (
    <section
      id="clients"
      aria-labelledby="clients-heading"
      className={`py-12 md:py-16 ${dark ? "bg-slate-950 text-white" : "bg-white text-gray-900"} ${className}`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <h2 id="clients-heading" className="text-center text-lg md:text-xl font-semibold mb-2">
          {t("clients.title")}
        </h2>
        <p className={`text-center text-sm mb-8 ${dark ? "text-slate-300" : "text-gray-600"}`}>{t("clients.note")}</p>
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
          {CLIENT_LOGOS.map(({ name, file }) => (
            <li
              key={name}
              className={`group flex h-14 sm:h-16 md:h-20 items-center justify-center rounded-lg md:rounded-xl bg-white px-2 md:px-4 ${
                dark ? "" : "border border-gray-200"
              }`}
            >
              <img
                src={`/images/clients/${file}`}
                alt={name}
                title={name}
                loading="lazy"
                decoding="async"
                className="max-h-7 sm:max-h-8 md:max-h-10 max-w-full object-contain grayscale opacity-80 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100 motion-reduce:transition-none"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
