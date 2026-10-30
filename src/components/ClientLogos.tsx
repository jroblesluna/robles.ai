import { CLIENT_LOGOS } from "@shared/publicContent";
import { useTranslation } from "react-i18next";

interface ClientLogosProps {
  /** "dark" for the landing's dark sections, "light" for the home page. */
  tone?: "dark" | "light";
  className?: string;
}

const half = Math.ceil(CLIENT_LOGOS.length / 2);
const ROWS = [CLIENT_LOGOS.slice(0, half), CLIENT_LOGOS.slice(half)];

/**
 * Client logo marquee: two rows drifting in opposite directions (`.logo-marquee` in index.css).
 * Each row renders twice so the loop is seamless; the copy is hidden from assistive tech, and with
 * reduced motion it is removed and the rows wrap as a static wall. Logos sit on white tiles so every
 * brand keeps its own colors on both light and dark backgrounds. `large` gives logos with a lot of
 * built-in padding a taller box.
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
        <div className="space-y-3">
          {ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="logo-marquee" data-reverse={rowIndex === 1 || undefined}>
              <div className="logo-marquee-track">
                {[false, true].map(copy => (
                  <ul key={String(copy)} aria-hidden={copy || undefined} data-copy={copy || undefined}>
                    {row.map(({ name, file, large }) => (
                      <li
                        key={name}
                        className={`group flex w-32 sm:w-36 md:w-44 h-14 sm:h-16 md:h-20 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-white px-2 md:px-4 ${
                          dark ? "" : "border border-gray-200"
                        }`}
                      >
                        <img
                          src={`/images/clients/${file}`}
                          alt={copy ? "" : name}
                          title={copy ? undefined : name}
                          decoding="async"
                          className={`${large ? "max-h-10 sm:max-h-12 md:max-h-16" : "max-h-7 sm:max-h-8 md:max-h-10"} max-w-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none`}
                        />
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
