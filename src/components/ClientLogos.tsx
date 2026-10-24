import { CLIENT_LOGOS } from "@shared/publicContent";
import { useTranslation } from "react-i18next";

interface ClientLogosProps {
  /** "dark" for the landing's dark sections, "light" for the home page. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * Client logo wall. Logos sit on white tiles so every brand keeps its own colors on both
 * light and dark backgrounds. Flex rows (2 / 4 / 6 per row) keep an incomplete last row centered. `large` gives logos with a lot of built-in padding a taller box.
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
        <ul className="flex flex-wrap justify-center gap-3">
          {CLIENT_LOGOS.map(({ name, file, large }) => (
            <li
              key={name}
              className={`group flex basis-[calc((100%-0.75rem)/2)] sm:basis-[calc((100%-2.25rem)/4)] lg:basis-[calc((100%-3.75rem)/6)] h-14 sm:h-16 md:h-20 items-center justify-center rounded-lg md:rounded-xl bg-white px-2 md:px-4 ${
                dark ? "" : "border border-gray-200"
              }`}
            >
              <img
                src={`/images/clients/${file}`}
                alt={name}
                title={name}
                loading="lazy"
                decoding="async"
                className={`${large ? "max-h-10 sm:max-h-12 md:max-h-16" : "max-h-7 sm:max-h-8 md:max-h-10"} max-w-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
