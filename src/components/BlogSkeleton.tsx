import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Skeletons for /blog and /blog/:slug. They mirror BlogList / BlogPost box for
// box so nothing jumps when the real content replaces them: static i18n copy is
// rendered as-is, and each placeholder line takes the real typography's height
// (`h-[1lh]` with the same text classes).

const pulse = 'animate-pulse motion-reduce:animate-none';
const light = `${pulse} bg-slate-200`;
const dark = `${pulse} bg-white/10`;

/** One placeholder line, exactly one line-height tall for the given text classes. */
function Line({ className = '', w = 'w-full', tone = light }: { className?: string; w?: string; tone?: string }) {
  return (
    <div className={`flex h-[1lh] items-center ${className}`}>
      <div className={`h-[0.7em] rounded ${w} ${tone}`} />
    </div>
  );
}

/** Navy masthead background shared by both pages. */
function Masthead({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0b1a3d] to-blue-950" />
      <div aria-hidden className="absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-600/25 blur-3xl" />
      {children}
    </section>
  );
}

const railHeading = 'flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500';

/**
 * Lead story + 5-story rail + "more stories" + 6-card grid (FEATURED_COUNT 6, PAGE_SIZE 12).
 * Also used by BlogList while posts load.
 */
export function BlogListContentSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-hidden>
      <div className="mb-14 grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className={`min-h-[420px] rounded-3xl lg:col-span-2 lg:min-h-[560px] ${light}`} />
        <div>
          <h2 className={`mb-5 ${railHeading}`}><span className="h-px w-6 bg-blue-600" />{t('blogHub.mustRead')}</h2>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex gap-4 ${i ? 'border-t border-slate-200 py-5' : 'pb-5'}`}>
              <div className={`h-6 w-7 shrink-0 rounded ${light}`} />
              <div className="min-w-0 flex-1">
                <Line className="mb-1.5 text-[11px]" w="w-24" />
                <Line className="text-base leading-snug" />
                <Line className="text-base leading-snug" />
                <Line className="text-base leading-snug" w="w-2/3" />
                <Line className="mt-2 text-xs" w="w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <h2 className={`mb-6 gap-3 ${railHeading}`}>
        <span className="h-px w-6 bg-blue-600" />{t('blogHub.moreStories')}<span className="h-px flex-1 bg-slate-200" />
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex justify-between gap-3">
              <Line className="text-[11px]" w="w-24" />
              <Line className="text-[11px]" w="w-14" />
            </div>
            <Line className="text-lg leading-snug" />
            <Line className="text-lg leading-snug" />
            <Line className="text-lg leading-snug" w="w-1/2" />
            <div className="mt-3">
              <Line className="text-sm leading-relaxed" />
              <Line className="text-sm leading-relaxed" w="w-3/4" />
            </div>
            <div className="mt-auto flex items-center gap-3 pt-6">
              <div className={`h-7 w-7 rounded-full ${light}`} />
              <Line className="text-xs" w="w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Whole /blog page while its chunk loads: same first paint BlogList renders while fetching. */
export function BlogListSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-label={t('state.loading')} className="min-h-screen bg-slate-50">
      <Masthead>
        <div className="container relative mx-auto px-4 pb-12 pt-12 sm:px-6 md:pb-14 md:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              {t('blogHub.eyebrow')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{t('blogHub.title')}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">{t('blogHub.subtitle')}</p>
            <div className="relative mx-auto mt-8 h-14 max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <li>{t('blogHub.statEditors')}</li>
              <li>{t('blogHub.statHourly')}</li>
            </ul>
          </div>
        </div>
      </Masthead>

      {/* section tabs (h-12) */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-12 items-center gap-6 overflow-hidden px-4 sm:px-6 md:px-16">
          {[64, 112, 96, 128, 80, 112, 96, 120].map((w, i) => (
            <div key={i} className={`h-3 shrink-0 rounded ${light}`} style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 sm:px-6 md:py-12">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{t('blogHub.latest')}</h2>
          <p className="mt-1" />
        </div>
        <div className="mb-8 border-b border-slate-200 pb-5">
          <div className="inline-flex min-h-[44px] rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[t('blogHub.anyTime'), t('blogHub.day'), t('blogHub.week'), t('blogHub.month')].map((label, i) => (
              <span key={i} className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${i ? 'text-slate-500' : 'bg-slate-900 text-white shadow-sm'}`}>{label}</span>
            ))}
          </div>
        </div>
        <BlogListContentSkeleton />
      </div>
    </div>
  );
}

/** /blog/:slug: breadcrumbs, title + byline card, TOC and article body. */
export function BlogPostSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-label={t('state.loading')} className="min-h-screen bg-slate-50">
      <Masthead>
        <div className="container relative mx-auto px-4 pb-12 pt-6 sm:px-6 md:pb-16 md:pt-8">
          <div className="flex gap-3 text-sm">
            <Line w="w-4" tone={dark} />
            <Line w="w-16" tone={dark} />
            <Line w="w-48" tone={dark} />
          </div>
          <div className="mt-8 grid gap-10 md:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-14 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <div className={`mb-5 h-[30px] w-40 rounded-full ${dark}`} />
              <div className="text-3xl font-bold leading-[1.15] md:text-5xl lg:text-[3.25rem]">
                <Line tone={dark} />
                <Line tone={dark} w="w-2/3" />
              </div>
              <div className="mt-5 max-w-3xl text-base leading-relaxed md:text-lg">
                <Line tone={dark} />
                <Line tone={dark} w="w-1/2" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="flex flex-wrap gap-x-8 gap-y-4 lg:flex-col">
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${dark}`} />
                    <div className="leading-tight">
                      <Line className="text-xs" w="w-16" tone={dark} />
                      <Line className="text-sm" w="w-28" tone={dark} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-1 border-t border-white/10 pt-4 text-sm">
                <Line w="w-40" tone={dark} />
                <Line w="w-32" tone={dark} />
              </div>
            </div>
          </div>
        </div>
      </Masthead>

      <div className="container mx-auto px-4 py-10 sm:px-6 md:py-14">
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-14">
          <div className="hidden lg:block">
            <Line className="mb-4 text-xs" w="w-28" />
            {Array.from({ length: 6 }).map((_, i) => <Line key={i} className="mb-2 text-sm leading-snug" w={i % 2 ? 'w-3/4' : 'w-full'} />)}
          </div>
          <div className="min-w-0">
            {/* phones/tablets: collapsed TOC above the article */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 lg:hidden">
              <div className="flex min-h-[44px] items-center"><Line className="text-sm" w="w-32" /></div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10 xl:p-14">
              {Array.from({ length: 3 }).map((_, s) => (
                <div key={s} className={s ? 'mt-10' : ''}>
                  <Line className="mb-4 text-2xl" w="w-1/2" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Line key={i} className="text-base leading-relaxed md:text-lg" w={i === 4 ? 'w-2/3' : 'w-full'} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
