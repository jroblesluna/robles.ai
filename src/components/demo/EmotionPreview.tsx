import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Generated portrait + illustrative overlays; never an inference on this person. */
export function EmotionPreview({ playing, run, onLoad }: {
  playing: boolean; run: number; onLoad: () => void;
}) {
  const { t } = useTranslation();
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Cached images can finish before hydration attaches the load handler.
    if (image.current?.complete && image.current.naturalWidth) onLoad();
  }, [onLoad]);
  const points = [[169,204], [257,204], [221,263], [183,296], [256,296], [221,310], [221,347]];
  return (
    <div className="emotion-preview h-full w-full" data-playing={playing}>
      <img ref={image} src="/demo-previews/emotion-portrait-v1-480.webp"
        srcSet="/demo-previews/emotion-portrait-v1-480.webp 480w, /demo-previews/emotion-portrait-v1-960.webp 960w"
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
        alt="" width={960} height={720} loading="lazy" decoding="async" onLoad={onLoad}
        className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      <svg key={run} viewBox="0 0 800 600" aria-hidden="true" className="emotion-overlay pointer-events-none absolute inset-0 h-full w-full">
        <rect className="emotion-frame" x="104" y="93" width="238" height="292" rx="20" fill="none" stroke="#a5f3fc" strokeWidth="2" />
        <path className="emotion-mesh" d="M169 204 L257 204 L221 263 Z M169 204 L183 296 L221 347 L256 296 L257 204 M183 296 L221 263 L256 296 M183 296 L221 310 L256 296" fill="none" stroke="#a5f3fc" strokeWidth="1.3" />
        {points.map(([cx, cy], index) => <circle className="emotion-point" key={index} cx={cx} cy={cy} r="4" fill="#e0f2fe" />)}
        {playing && <rect className="emotion-scan" x="105" y="95" width="236" height="3" rx="1.5" fill="#67e8f9" />}
      </svg>
      <div key={`output-${run}`} aria-hidden="true" className="emotion-result pointer-events-none absolute left-[53%] right-[4%] top-[26%] rounded-xl border border-white/20 bg-slate-950/85 p-2.5 shadow-xl">
        <p className="mb-2 whitespace-nowrap text-[9px] font-semibold uppercase leading-3 tracking-wide text-cyan-200">{t('demosCatalog.emotionPreview.output')}</p>
        <div className="space-y-2">
          {[{ key: 'neutral', width: '76%' }, { key: 'happy', width: '42%' }, { key: 'surprise', width: '24%' }].map(row => (
            <div key={row.key} className="space-y-1">
              <p className="text-[10px] leading-3 text-slate-100">{t(`demosCatalog.mock.${row.key}`)}</p>
              <div className="h-1 overflow-hidden rounded-full bg-slate-700"><div className="emotion-bar h-full origin-left rounded-full bg-cyan-300" style={{ width: row.width }} /></div>
            </div>
          ))}
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-[10px] font-medium leading-4 text-slate-200">{t('demosCatalog.emotionPreview.notice')}</p>
    </div>
  );
}
