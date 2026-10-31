import type { ReactNode } from "react";
import { Link } from "wouter";
import { FlaskConical, MessageCircle, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage, staticPagePath } from "@shared/seoPolicy";
import { useDemoAvailable } from "@/lib/siteConfig";
import type { DemoApi } from "@/lib/demoAuth";
import { useGoToHomeSection } from "./business";

/**
 * Shows a demo unless the server says it cannot run (API keys enforced and no
 * demo key for this API). The visitor then gets a notice instead of controls
 * that would only fail; the technical cause stays in Admin → Backends.
 */
export function DemoGate({ api, children }: { api: DemoApi; children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const goToHomeSection = useGoToHomeSection();
  if (useDemoAvailable(api)) return <>{children}</>;
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4 py-16">
      <div role="status" className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Wrench className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">{t("demoUnavailable.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{t("demoUnavailable.body")}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={staticPagePath("/demos", lang)}
            className="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <FlaskConical className="h-4 w-4" />
            {t("demoNav.lab")}
          </Link>
          <button
            type="button"
            onClick={() => goToHomeSection("contact")}
            className="tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4" />
            {t("demoUnavailable.contact")}
          </button>
        </div>
      </div>
    </section>
  );
}
