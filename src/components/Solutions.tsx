import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Eye,
  MessageSquare,
  BarChart3,
  Play,
  Pause,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { fadeIn, staggerContainer } from '@/utils/animations';
import { useTranslation } from 'react-i18next';

type IconName = 'Cpu' | 'Eye' | 'MessageSquare' | 'BarChart3';

interface SolutionItem {
  id: number;
  icon: IconName;
  title: string;
  description: string;
  tags?: string[];
  solutionCta: string;
  videoSrc: string;
}

const ROTATE_MS = 7000;

// Static class maps so Tailwind can see every class (JSON isn't scanned).
const ACCENTS: Record<
  IconName,
  { text: string; tile: string; bar: string; glow: string; slug: string }
> = {
  Cpu: {
    text: 'text-blue-600',
    tile: 'bg-blue-600',
    bar: 'bg-blue-600',
    glow: 'rgba(59,130,246,0.35)',
    slug: 'ml-forecast',
  },
  Eye: {
    text: 'text-emerald-600',
    tile: 'bg-emerald-600',
    bar: 'bg-emerald-600',
    glow: 'rgba(16,185,129,0.30)',
    slug: 'vision-detect',
  },
  MessageSquare: {
    text: 'text-violet-600',
    tile: 'bg-violet-600',
    bar: 'bg-violet-600',
    glow: 'rgba(139,92,246,0.35)',
    slug: 'nlp-assistant',
  },
  BarChart3: {
    text: 'text-indigo-600',
    tile: 'bg-indigo-600',
    bar: 'bg-indigo-600',
    glow: 'rgba(99,102,241,0.35)',
    slug: 'dl-anomaly',
  },
};
const ICONS: Record<IconName, typeof Cpu> = { Cpu, Eye, MessageSquare, BarChart3 };

// ── Product mock-ups (dark "app window" visuals) ──────────────────────────────
type T = (k: string) => string;

const MLVisual = ({ t }: { t: T }) => (
  <div className="flex h-full flex-col gap-4">
    <div className="grid grid-cols-2 gap-3">
      {[
        { k: t('solutions.ui.accuracy'), v: '94.2%' },
        { k: t('solutions.ui.forecast'), v: '+18.4%' },
      ].map((m) => (
        <div key={m.k} className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{m.k}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{m.v}</p>
        </div>
      ))}
    </div>
    <div className="relative min-h-0 flex-1 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
      <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="none">
        {[40, 80, 120].map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path
          d="M240 70 L280 58 L320 50 L360 36 L400 24 L400 64 L360 72 L320 80 L280 86 L240 88 Z"
          fill="rgba(59,130,246,0.18)"
        />
        <motion.path
          d="M0 120 L40 110 L80 116 L120 96 L160 100 L200 84 L240 78"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <motion.path
          d="M240 78 L280 72 L320 64 L360 54 L400 44"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          strokeDasharray="6 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.1, ease: 'easeOut' }}
        />
        <line
          x1="240"
          x2="240"
          y1="0"
          y2="160"
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="3 4"
        />
        <circle cx="400" cy="44" r="4" fill="#60a5fa" />
      </svg>
    </div>
  </div>
);

const CVVisual = () => {
  const { i18n } = useTranslation();
  const lang =
    i18n.resolvedLanguage?.startsWith('es') || i18n.language?.startsWith('es') ? 'es' : 'en';
  return (
    <img
      src={`/demo-previews/objectdetection-${lang}.svg`}
      alt=""
      width={800}
      height={600}
      className="h-full w-full rounded-xl object-contain"
    />
  );
};

const NLPVisual = ({ t }: { t: T }) => (
  <div className="flex h-full flex-col gap-3">
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-white/10 px-4 py-2.5 text-sm text-slate-100"
    >
      {t('solutions.ui.chatUser')}
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="flex max-w-[85%] gap-2.5 self-start"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </span>
      <div className="rounded-2xl rounded-tl-sm bg-violet-500/15 px-4 py-2.5 text-sm text-violet-50 ring-1 ring-violet-400/20">
        {t('solutions.ui.chatBot')}
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className="mt-auto grid grid-cols-2 gap-3"
    >
      <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">
          {t('solutions.ui.sentiment')}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-violet-400"
            initial={{ width: 0 }}
            animate={{ width: '82%' }}
            transition={{ delay: 1.7, duration: 0.8 }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-300">{t('solutions.ui.positive')} · 82%</p>
      </div>
      <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">
          {t('solutions.ui.intent')}
        </p>
        <span className="mt-2 inline-block rounded-md bg-violet-400/15 px-2 py-1 font-mono text-[11px] text-violet-200">
          order.delay
        </span>
      </div>
    </motion.div>
  </div>
);

const DL_POINTS = [52, 48, 55, 50, 53, 49, 51, 54, 50, 18, 52, 49, 53, 51, 48, 52];

const DLVisual = ({ t }: { t: T }) => {
  const step = 400 / (DL_POINTS.length - 1);
  const path = DL_POINTS.map((y, i) => `${i ? 'L' : 'M'}${i * step} ${y * 2}`).join(' ');
  const ax = 9 * step,
    ay = DL_POINTS[9] * 2;
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative min-h-0 flex-1 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
        <svg
          viewBox="0 0 400 140"
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <rect x="0" y="80" width="400" height="40" fill="rgba(99,102,241,0.12)" />
          <motion.path
            d={path}
            fill="none"
            stroke="#a5b4fc"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
          <motion.circle
            cx={ax}
            cy={ay}
            r="6"
            fill="#f43f5e"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ delay: 1.2, duration: 0.5 }}
          />
        </svg>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="flex items-center gap-3 rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-400/20"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
        <p className="flex-1 text-sm text-rose-100">{t('solutions.ui.anomaly')}</p>
        <span className="font-mono text-xs text-rose-300">p=0.003</span>
      </motion.div>
    </div>
  );
};

const VISUALS: Record<IconName, (p: { t: T }) => React.ReactElement> = {
  Cpu: MLVisual,
  Eye: CVVisual,
  MessageSquare: NLPVisual,
  BarChart3: DLVisual,
};

// ── Showcase panel ────────────────────────────────────────────────────────────
const Showcase = ({
  solution,
  onPlay,
  t,
}: {
  solution: SolutionItem;
  onPlay: () => void;
  t: T;
}) => {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    // A responsive layout change must not leave a hidden player producing audio.
    if (typeof window.matchMedia !== 'function') return;
    const breakpoint = window.matchMedia('(min-width: 1024px)');
    const reset = () => setPlaying(false);
    breakpoint.addEventListener('change', reset);
    return () => breakpoint.removeEventListener('change', reset);
  }, []);
  const accent = ACCENTS[solution.icon] ?? ACCENTS.Cpu;
  const Visual = VISUALS[solution.icon] ?? MLVisual;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-2 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)] ring-1 ring-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[80%] -translate-x-1/2 rounded-full blur-3xl transition-colors duration-700"
        style={{ background: accent.glow }}
      />
      <div className="relative rounded-[20px] bg-slate-900/60 ring-1 ring-white/10">
        {/* window chrome */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 font-mono text-xs text-slate-400">
            robles.ai / {accent.slug}
          </span>
          <span className="ml-auto text-xs text-slate-300">
            {t('solutions.ui.previewLabel')}
          </span>
        </div>

        <div className="h-[340px] p-5 sm:h-[380px]">
          {playing ? (
            <iframe
              src={solution.videoSrc + '&playsinline=1'}
              title={solution.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full rounded-xl bg-black"
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={solution.id}
                className="h-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <Visual t={t} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {(solution.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onPlay();
              setPlaying((value) => !value);
            }}
            className="ml-3 inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {playing ? t('solutions.backToPreview') : solution.solutionCta}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Section ───────────────────────────────────────────────────────────────────
const Solutions = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [autoEnabled, setAutoEnabled] = useState(false);

  const solutions = t('solutions.items', { returnObjects: true }) as SolutionItem[];
  const current = solutions[active] ?? solutions[0];
  const autoplay = autoEnabled && !reduceMotion;
  useEffect(() => {
    if (!autoplay || !solutions.length) return;
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % solutions.length),
      ROTATE_MS
    );
    return () => window.clearTimeout(timer);
  }, [autoplay, active, solutions.length]);

  return (
    <section
      id="solutions"
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest('[data-rotation-control]'))
          setAutoEnabled(false);
      }}
      className="relative scroll-mt-10 bg-white py-[60px]"
    >
      <style>{`@keyframes sol-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>

      <motion.div
        className="container mx-auto max-w-[max(80rem,70vw)] px-6"
        variants={staggerContainer}
        initial={false}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {/* header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <motion.span
            variants={fadeIn}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 ring-1 ring-blue-100"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {t('solutions.eyebrow')}
          </motion.span>
          <motion.h2
            variants={fadeIn}
            custom={0.1}
            className="mt-5 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl"
          >
            {t('solutions.title')}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.2}
            className="mt-5 text-lg leading-relaxed text-gray-500"
          >
            {t('solutions.subtitle')}
          </motion.p>
        </div>

        <div className="mb-5 flex justify-center">
          <button
            type="button"
            data-rotation-control="solutions"
            aria-controls="solutions-options"
            aria-pressed={autoplay}
            onClick={() => setAutoEnabled((value) => !value)}
            disabled={reduceMotion}
            className="tap-target gap-2 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {autoEnabled ? (
              <Pause aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Play aria-hidden="true" className="h-4 w-4" />
            )}
            {t(autoEnabled ? 'solutions.stopPreview' : 'solutions.startPreview')}
          </button>
        </div>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* selector */}
          <motion.div
            variants={fadeIn}
            custom={0.3}
            id="solutions-options"
            role="group"
            aria-label={t('solutions.title')}
            className="flex flex-col gap-2 lg:col-span-5"
          >
            {solutions.map((s, i) => {
              const accent = ACCENTS[s.icon] ?? ACCENTS.Cpu;
              const Icon = ICONS[s.icon] ?? Cpu;
              const isActive = i === active;
              return (
                <div key={s.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setAutoEnabled(false);
                      setActive(i);
                    }}
                    className={`relative w-full overflow-hidden rounded-2xl p-5 text-left transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                          isActive
                            ? `${accent.tile} text-white shadow-sm`
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={`flex-1 text-base font-semibold tracking-tight transition-colors ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
                      >
                        {s.title}
                      </span>
                      <span className="font-mono text-xs text-gray-600">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <p className="pl-14 pt-3 text-[15px] leading-relaxed text-gray-500">
                            {s.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* autoplay progress */}
                    {isActive && autoplay && (
                      <span className="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full bg-gray-200">
                        <span
                          key={active}
                          className={`block h-full origin-left ${accent.bar}`}
                          style={{
                            animation: `sol-progress ${ROTATE_MS}ms linear forwards`,
                          }}
                        />
                      </span>
                    )}
                  </button>

                  {/* mobile: showcase inline under the active item */}
                  {isActive && (
                    <div className="mt-3 lg:hidden">
                      <Showcase solution={s} t={t} onPlay={() => setAutoEnabled(false)} />
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* desktop showcase */}
          <motion.div variants={fadeIn} custom={0.4} className="hidden lg:col-span-7 lg:block">
            {current && (
              <Showcase
                key={current.id}
                solution={current}
                t={t}
                onPlay={() => setAutoEnabled(false)}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Solutions;
