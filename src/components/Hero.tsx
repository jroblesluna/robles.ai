import { normalizeLanguage, staticPagePath } from '@shared/seoPolicy';
import { ArrowRight, Database, Layers3, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

/** Stable, server-renderable introduction. Robly belongs to the chat widget. */
export default function Hero() {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const stages = [
    { key: 'data', icon: Database },
    { key: 'intelligence', icon: Layers3 },
    { key: 'delivery', icon: Workflow },
  ];
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300';

  return (
    <section id="hero" aria-labelledby="hero-title" className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300 sm:text-sm">{t('hero.eyebrow')}</p>
            <h1 id="hero-title" className="max-w-[18ch] text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-6 max-w-[54ch] text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{t('hero.subtitle')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={staticPagePath('/get-started', lang)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 ${focus}`}>
                {t('hero.cta3')}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
              <Link href={staticPagePath('/demos', lang)} className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 ${focus}`}>
                {t('hero.demosCta')}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6">
              <a href="#features" className={`inline-flex min-h-11 items-center text-sm text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-white ${focus}`}>{t('hero.cta1')}</a>
              <Link href={staticPagePath('/blog', lang)} className={`inline-flex min-h-11 items-center text-sm text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-white ${focus}`}>{t('hero.cta2')}</Link>
            </div>
            <p className="mt-6 max-w-[54ch] border-t border-slate-800 pt-5 text-sm leading-6 text-slate-400"><span className="font-medium text-slate-300">{t('hero.capabilitiesLabel')}: </span>{t('hero.capabilities')}</p>
          </div>
          <aside aria-labelledby="hero-architecture-title" className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-widest text-blue-300">{t('hero.architecture.label')}</p>
            <h2 id="hero-architecture-title" className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{t('hero.architecture.title')}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{t('hero.architecture.description')}</p>
            <ul className="mt-6 space-y-4">
              {stages.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-300" />{t(`hero.architecture.${key}.title`)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{t(`hero.architecture.${key}.description`)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href={staticPagePath('/diagnostico-ia', lang)} className={`mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-300 underline underline-offset-4 hover:text-white ${focus}`}>
              {t('hero.diagnosisCta')}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
