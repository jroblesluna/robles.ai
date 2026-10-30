import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { TextSkeleton } from "@/components/ui/text-skeleton";

const PULSE = "animate-pulse motion-reduce:animate-none";

/** /diagnostico-ia while its chunk loads: same section wrapper and boxes as Quiz + QuizIntro. */
export default function QuizSkeleton() {
  const { t } = useTranslation();
  const deliverables = t("quiz.intro.deliverables", { returnObjects: true }) as { title: string; desc: string }[];
  const steps = t("quiz.intro.steps", { returnObjects: true }) as string[];
  return (
    <section
      role="status"
      aria-busy="true"
      aria-label={t("state.loading")}
      className="relative isolate min-h-[calc(100vh-var(--header-h))] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-12 md:py-20"
    >
      <div aria-hidden className="container mx-auto w-full max-w-6xl px-4 sm:px-6 select-none">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-1.5 text-sm font-medium text-transparent ${PULSE}`}>
              <span className="h-4 w-4" />
              {t("quiz.intro.badge")}
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl lg:leading-[1.08]"><TextSkeleton>{t("quiz.intro.title")}</TextSkeleton></h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed"><TextSkeleton>{t("quiz.intro.subtitle")}</TextSkeleton></p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              {[t("quiz.intro.stats.questions"), t("quiz.intro.duration"), t("quiz.intro.stats.cost")].map(label => (
                <li key={label} className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded-full bg-slate-200 ${PULSE}`} />
                  <TextSkeleton>{label}</TextSkeleton>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-slate-200 px-8 py-4 text-lg font-semibold text-transparent ${PULSE}`}>
                {t("quiz.intro.cta")}
                <span className="h-5 w-5" />
              </div>
              <p className="max-w-xs text-sm"><TextSkeleton>{t("quiz.intro.disclaimer")}</TextSkeleton></p>
            </div>
            <ol className="mt-12 grid grid-cols-1 gap-3 border-t border-gray-200 pt-8 sm:grid-cols-3">
              {steps.map(step => (
                <li key={step} className="flex items-start gap-3">
                  <span className={`h-7 w-7 shrink-0 rounded-full bg-slate-200 ${PULSE}`} />
                  <span className="pt-1 text-sm leading-snug"><TextSkeleton>{step}</TextSkeleton></span>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative min-w-0">
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-slate-900/10">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-44 bg-white/15" />
                  <Skeleton className="h-6 w-16 rounded-full bg-white/15" />
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <Skeleton className="h-28 w-28 shrink-0 rounded-full border-[10px] border-white/15 bg-transparent" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-6 w-4/5 bg-white/15" />
                    <Skeleton className="h-4 w-3/5 bg-white/10" />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map(step => (
                    <div key={step} className="space-y-2">
                      <Skeleton className="h-1.5 rounded-full bg-white/15" />
                      <Skeleton className="h-3.5 w-3/4 bg-white/10 sm:h-4" />
                    </div>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-gray-100">
                {deliverables.map(item => (
                  <li key={item.title} className="flex items-start gap-4 px-6 py-4 sm:px-7">
                    <span className={`h-10 w-10 shrink-0 rounded-xl bg-slate-200 ${PULSE}`} />
                    <div className="min-w-0">
                      <p className="font-semibold"><TextSkeleton>{item.title}</TextSkeleton></p>
                      <p className="mt-0.5 text-sm leading-snug"><TextSkeleton>{item.desc}</TextSkeleton></p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
