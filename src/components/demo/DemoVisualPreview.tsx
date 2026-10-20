import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Public assets only: these previews never call a demo service or run inference. */
export const DEMO_PHOTOS: Record<string, string> = {
  sitechatbot: 'sitechatbot-photo-v1', identity: 'identity-photo-v1', rag: 'rag-photo-v1',
  speech: 'speech-photo-v1', langchain: 'langchain-photo-v1', objectdetection: 'objectdetection-photo-v1',
  emotion: 'emotion-portrait-v1', docextract: 'docextract-photo-v1', tts: 'tts-photo-v1',
  forecast: 'forecast-photo-v1', voiceagent: 'voiceagent-photo-v1', anomaly: 'anomaly-photo-v1', imagegen: 'imagegen-photo-v1',
};

type Scene = 'chat' | 'identity' | 'retrieval' | 'audio' | 'workflow' | 'objects' | 'document' | 'forecast' | 'security' | 'creative';
const SCENES: Record<string, Scene> = {
  sitechatbot: 'chat', identity: 'identity', rag: 'retrieval', speech: 'audio', langchain: 'workflow',
  objectdetection: 'objects', docextract: 'document', tts: 'audio', forecast: 'forecast',
  voiceagent: 'audio', anomaly: 'security', imagegen: 'creative',
};

function SceneOverlay({ scene, playing }: { scene: Scene; playing: boolean }) {
  return <svg viewBox="0 0 800 600" aria-hidden="true" className="demo-scene pointer-events-none absolute inset-0 h-full w-full" fill="none" stroke="#a5f3fc" strokeWidth="2">
    {scene === 'identity' && <>
      <rect className="demo-reveal" x="100" y="100" width="240" height="300" rx="30" />
      <path className="demo-draw" d="M145 205h45m55 0h45M200 285l20 18 30-35" />
      {playing && <path className="demo-scan" d="M102 105H338" stroke="#67e8f9" strokeWidth="3" />}
    </>}
    {scene === 'objects' && <>
      <rect className="demo-reveal" x="20" y="170" width="260" height="210" rx="8" />
      <rect className="demo-reveal demo-delay" x="234" y="230" width="197" height="175" rx="8" />
      <rect className="demo-reveal demo-delay" x="125" y="320" width="195" height="120" rx="8" />
    </>}
    {(scene === 'document' || scene === 'retrieval') && <>
      <rect className="demo-reveal" x="70" y="185" width="260" height="265" rx="12" transform="rotate(-8 200 315)" />
      <g className="demo-draw" strokeWidth="4"><path d="M120 260h150m-150 42h110m-110 42h130" /></g>
      {playing && <path className="demo-scan" d="M78 190H322" stroke="#67e8f9" strokeWidth="3" />}
    </>}
    {scene === 'workflow' && <g className="demo-workflow">
      <path className="demo-draw" d="M85 340H200V235H330M200 340v95h130" strokeDasharray="7 8" />
      {[[85,340],[200,235],[330,235],[330,435]].map(([cx,cy],i)=><g className="demo-reveal" key={i} style={{animationDelay:`${i*0.12}s`}}><circle cx={cx} cy={cy} r="22" fill="#0f172a" /><circle cx={cx} cy={cy} r="6" fill="#67e8f9" /></g>)}
    </g>}
    {scene === 'audio' && <g className="demo-wave" strokeWidth="5" strokeLinecap="round">
      {[25,48,78,110,65,135,92,55,100,68,36].map((h,i)=><path key={i} className="demo-wave-bar" style={{animationDelay:`${i*0.055}s`}} d={`M${75+i*25} ${340-h/2}v${h}`} />)}
    </g>}
    {scene === 'chat' && <g>
      <rect className="demo-reveal" x="90" y="245" width="210" height="60" rx="20" fill="#0f172a" fillOpacity=".85" />
      <path className="demo-draw" d="M120 275h135" strokeWidth="4" />
      <rect className="demo-reveal demo-delay" x="125" y="325" width="210" height="65" rx="20" fill="#164e63" fillOpacity=".9" />
      <path className="demo-draw" d="M150 355h155" strokeWidth="4" />
    </g>}
    {scene === 'forecast' && <g>
      <path className="demo-reveal" d="M70 245v190h300" opacity=".6" />
      <path className="demo-draw" d="M80 410l45-45 45 15 45-75 45 25" strokeWidth="5" />
      <path className="demo-draw" d="M260 330l40-70 55-25" stroke="#c4b5fd" strokeWidth="5" strokeDasharray="8 9" />
    </g>}
    {scene === 'security' && <g>
      <path className="demo-reveal" d="M210 210l90 30v80c0 55-45 95-90 120-45-25-90-65-90-120v-80z" fill="#0f172a" fillOpacity=".75" />
      <path className="demo-draw" d="M170 320l30 30 55-65" strokeWidth="5" />
    </g>}
    {scene === 'creative' && <g>
      <rect className="demo-reveal" x="100" y="170" width="240" height="290" rx="15" />
      <path className="demo-draw" d="M110 180h45m-45 0v45m220 225h-45m45 0v-45" strokeWidth="4" />
      {playing && <path className="demo-scan" d="M104 175H336" stroke="#c4b5fd" strokeWidth="3" />}
    </g>}
  </svg>;
}

export function DemoVisualPreview({ id, playing, run, onLoad }: {
  id: string; playing: boolean; run: number; onLoad: () => void;
}) {
  const { t } = useTranslation();
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth) onLoad();
  }, [onLoad]);
  const photo = DEMO_PHOTOS[id];
  return <div className="demo-photo-preview h-full w-full" data-playing={playing} data-scene={SCENES[id]}>
    <img ref={image} src={`/demo-previews/${photo}-480.webp`}
      srcSet={`/demo-previews/${photo}-480.webp 480w, /demo-previews/${photo}-960.webp 960w`}
      sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
      alt="" width={960} height={720} loading="lazy" decoding="async" onLoad={onLoad} className="h-full w-full object-cover" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
    <SceneOverlay key={run} scene={SCENES[id]} playing={playing} />
    <div key={`result-${run}`} aria-hidden="true" className="demo-output pointer-events-none absolute left-[53%] right-[4%] top-[24%] rounded-xl border border-white/20 bg-slate-950/90 p-2.5 shadow-xl">
      <p className="mb-2 text-[9px] font-semibold uppercase leading-3 tracking-wide text-cyan-200">{t(`demosCatalog.photoPreview.scenes.${id}.title`)}</p>
      <div className="space-y-2">
        {[0,1,2].map(index=><div key={index} className="demo-output-row flex items-start gap-1.5" style={{animationDelay:`${index*0.15}s`}}>
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-300" />
          <p className="min-w-0 text-[10px] leading-3 text-slate-100">{t(`demosCatalog.photoPreview.scenes.${id}.rows.${index}`)}</p>
        </div>)}
      </div>
    </div>
    <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-[10px] font-medium leading-4 text-slate-200">{t(`demosCatalog.photoPreview.scenes.${id}.caption`)}</p>
  </div>;
}
