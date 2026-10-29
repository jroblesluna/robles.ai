import { useTranslation } from "react-i18next";
import { TextSkeleton } from "@/components/ui/text-skeleton";

/** /diagnostico-ia while its chunk loads: same section wrapper and boxes as Quiz + QuizIntro. */
export default function QuizSkeleton() {
  const { t } = useTranslation();
  return (
    <section
      role="status"
      aria-busy="true"
      aria-label={t("state.loading")}
      className="py-16 md:py-24 bg-white min-h-[calc(100vh-68px)] flex items-center"
    >
      <div aria-hidden className="container mx-auto px-6 w-full -translate-y-8">
        <div className="max-w-2xl mx-auto text-center select-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-1.5 text-sm font-medium text-transparent mb-6 animate-pulse motion-reduce:animate-none">
            <span className="h-4 w-4" />
            {t("quiz.intro.badge")}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6"><TextSkeleton>{t("quiz.intro.title")}</TextSkeleton></h1>
          <p className="text-lg md:text-xl mb-8 max-w-xl mx-auto"><TextSkeleton>{t("quiz.intro.subtitle")}</TextSkeleton></p>
          <div className="flex items-center justify-center gap-2 mb-10">
            <span className="h-5 w-5 rounded-full bg-slate-200 animate-pulse motion-reduce:animate-none" />
            <TextSkeleton>{t("quiz.intro.duration")}</TextSkeleton>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-8 py-4 text-lg font-semibold text-transparent animate-pulse motion-reduce:animate-none">
            {t("quiz.intro.cta")}
            <span className="h-5 w-5" />
          </div>
          <p className="text-sm mt-6"><TextSkeleton>{t("quiz.intro.disclaimer")}</TextSkeleton></p>
        </div>
      </div>
    </section>
  );
}
