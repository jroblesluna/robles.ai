import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BookOpen, CalendarDays, ChevronDown, Clock, Mail, Video, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fadeIn, staggerContainer } from '@/utils/animations';
import { usePublicDialog } from '@/hooks/usePublicDialog';
import { COURSE_IDS, courseWorkload, nextCourseStart, type CourseId } from '@shared/courseCatalog';

interface Module { title: string; description: string; topics: string[] }
interface Course {
  id: CourseId; image: string; level: string; title: string; description: string; duration: string; format: string;
  regularPrice: string; price: string; category: string; buttonBg: string; buttonHoverBg: string;
  modules: Module[];
  details?: { book?: { title: string; subtitle?: string; author?: string; editorial?: string; date?: string } };
}
const startLabel = (date: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

function CourseInterest({ courseId, startDate, onDateChange }: { courseId: CourseId; startDate: string; onDateChange: (date: string) => void }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || status === 'success') return;
    setPending(true); setStatus(null);
    try {
      const response = await fetch('/api/courses/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId, email: email.trim(), locale, website }) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error('Request not accepted');
      if (/^\d{4}-\d{2}-\d{2}$/.test(result.nextStartDate || '')) onDateChange(result.nextStartDate);
      setStatus('success'); setEmail('');
    } catch { setStatus('error'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="mt-4 space-y-2" aria-label={t('courses.modal.notifyTitle')}>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{t('courses.modal.notifyTitle')}</label>
    <p className="text-sm text-slate-600">{t('courses.modal.notifyDescription')}</p>
    <div className="flex flex-col gap-2 sm:flex-row">
      <input id={id} name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={pending || status === 'success'} placeholder={t('courses.modal.emailPlaceholder')} className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:bg-slate-100" aria-describedby={`${id}-feedback ${id}-privacy`} />
      <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
      <button type="submit" disabled={pending || status === 'success'} className="tap-target inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"><Mail className="h-4 w-4" aria-hidden="true" />{pending ? t('courses.modal.sending') : status === 'success' ? t('courses.modal.requestReceived') : t('courses.modal.notifyButton')}</button>
    </div>
    <div id={`${id}-feedback`} aria-live="polite">{status === 'success' && <p role="status" className="text-sm font-medium text-emerald-800">{t('courses.modal.notifySuccess')}</p>}{status === 'error' && <p role="alert" className="text-sm font-medium text-red-700">{t('courses.modal.notifyError')}</p>}</div>
    <p id={`${id}-privacy`} className="text-xs text-slate-600">{t('courses.modal.privacy')}</p>
  </form>;
}
function Certificate({ course, hours }: { course: Course; hours: number }) {
  const { t } = useTranslation();
  return <section aria-label={t('courses.modal.certificateTitle')} className="space-y-3">
    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Award className="h-5 w-5 text-blue-700" aria-hidden="true" />{t('courses.modal.certificateTitle')}</h3>
    <div className="relative isolate w-full aspect-[1.5/1] min-h-[250px] overflow-hidden rounded-xl border border-slate-200 bg-[#fffdfa] p-2.5 sm:p-3 shadow-md flex flex-col justify-between select-none">
      <div className="absolute -right-12 -top-12 h-32 w-32 rotate-45 bg-blue-900/10 pointer-events-none" aria-hidden="true" />
      <div className="relative h-full flex flex-col justify-between rounded-lg border border-amber-600/50 bg-gradient-to-b from-white/90 via-[#fffdf9]/95 to-amber-50/40 p-3 sm:p-4 text-center">
        <div className="flex items-center justify-between border-b border-amber-700/20 pb-1.5">
          <p className="text-sm font-extrabold tracking-tight text-blue-950">Robles<span className="text-blue-700">.AI</span></p>
          <div className="flex items-center gap-1 text-amber-700"><Award className="h-3.5 w-3.5" aria-hidden="true" /><span className="text-[9px] font-semibold uppercase tracking-wider">{t('courses.modal.training')}</span></div>
        </div>
        <div className="my-auto py-1">
          <p className="font-serif text-base sm:text-lg font-bold leading-tight text-blue-950">{t('courses.modal.certificateHeading')}</p>
          <p className="mt-1 text-[10px] text-slate-500">{t('courses.modal.awardedTo')}</p>
          <p className="mx-auto max-w-[260px] border-b border-amber-700/30 pb-0.5 font-serif text-sm sm:text-base font-semibold text-slate-900">{t('courses.modal.participantName')}</p>
          <p className="mt-1 text-[10px] text-slate-500">{t('courses.modal.participation')}</p>
          <p className="text-xs sm:text-sm font-bold leading-snug text-blue-950">{course.title}</p>
          <p className="mt-0.5 text-[10px] sm:text-xs text-slate-600">{t('courses.modal.certificateHours', { hours })}</p>
        </div>
        <div className="grid grid-cols-3 items-end gap-2 border-t border-amber-700/20 pt-1.5 text-[9px] text-slate-600">
          <p className="border-t border-slate-300 pt-1 leading-tight">{t('courses.modal.academicTeam')}<br /><span className="text-[8px] text-slate-400">Robles.AI</span></p>
          <div><span className="inline-block rounded border border-amber-700/30 bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-800">{t('courses.modal.sampleMark')}</span></div>
          <p className="border-t border-slate-300 pt-1 leading-tight">{t('courses.modal.issueDate')}</p>
        </div>
      </div>
    </div>
    <p className="text-xs text-slate-600">{t('courses.modal.certificateNote')}</p>
  </section>;
}
export function CourseDetailsModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const panel = usePublicDialog(onClose);
  const id = useId();
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  const [startDate, setStartDate] = useState(() => nextCourseStart());
  const hours = courseWorkload(course.id);
  useEffect(() => {
    const update = () => setStartDate(nextCourseStart());
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1} className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl outline-none sm:max-h-[90dvh]">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-5 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Robles.AI · {course.category}</p><h2 id={`${id}-title`} className="mt-1 break-words text-xl font-bold sm:text-2xl">{course.title}</h2><p className="mt-1 text-sm text-slate-600">{course.level} · {t('courses.modal.liveOnline')}</p></div>
        <button type="button" onClick={onClose} aria-label={t('courses.modal.close')} className="tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
        <p className="mb-6 leading-relaxed text-slate-600">{course.description}</p>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div>
            <Certificate course={course} hours={hours.totalHours} />
          </div>
          <section aria-label={t('courses.modal.availability')} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <p className="flex items-center gap-2 font-bold text-amber-950"><CalendarDays className="h-5 w-5 text-amber-900" aria-hidden="true" />{t('courses.modal.noSeats')}</p>
              <p className="mt-1 text-sm text-amber-950">{t('courses.modal.nextStart')} <time dateTime={startDate} className="font-semibold">{startLabel(startDate, locale)}</time></p>
              <p className="mt-1 text-xs text-amber-900">{t('courses.modal.dateNote')}</p>
            </div>
            <CourseInterest courseId={course.id} startDate={startDate} onDateChange={setStartDate} />
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {[
                [t('courses.modal.durationLabel'), t('courses.modal.weeks', { count: hours.weeks })],
                [t('courses.modal.weeklyLabel'), t('courses.modal.hours', { count: hours.weeklyHours })],
                [t('courses.modal.totalLabel'), t('courses.modal.hours', { count: hours.totalHours })],
                [t('courses.modal.modeLabel'), t('courses.modal.liveOnline')],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-base font-bold text-slate-900">{value}</dd></div>)}
            </dl>
            <p className="mt-2 text-xs text-slate-500">{t('courses.modal.workloadNote', { live: hours.liveHoursPerWeek, practice: hours.practiceHoursPerWeek, liveTotal: hours.totalLiveHours })}</p>
          </section>
        </div>
        <div className="mt-8 grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <section aria-labelledby={`${id}-modules`} className="min-w-0"><h3 id={`${id}-modules`} className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><BookOpen className="h-5 w-5 text-blue-700" aria-hidden="true" />{t('courses.modal.modulesTitle')}</h3>
            <div className="space-y-3">{course.modules.map((module, index) => <details key={module.title} className="group overflow-hidden rounded-xl border border-slate-200 bg-white open:border-blue-300 open:bg-blue-50/30"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-800">{index + 1}</span><span className="min-w-0 flex-1 text-sm">{module.title}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="px-4 pb-4 text-sm leading-relaxed text-slate-700"><p>{module.description}</p><ul className="mt-3 list-disc space-y-1 pl-5">{module.topics.map((topic, topicIndex) => <li key={topicIndex}>{topic}</li>)}</ul></div></details>)}</div>
            {course.details?.book && <p className="mt-4 text-xs leading-relaxed text-slate-600">{t('courses.modal.reference')}: {course.details.book.title} · {course.details.book.author} · {course.details.book.editorial} ({course.details.book.date}).</p>}
          </section>
          <aside className="min-w-0 space-y-5"><div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">{t('courses.modal.methodTitle')}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{t('courses.modal.methodDescription')}</p><p className="mt-3 border-t border-slate-200/60 pt-3 text-sm text-slate-600">{t('courses.modal.priceLabel')}: <span className="font-semibold text-slate-900">{course.price || course.regularPrice}</span></p></div></aside>
        </div>
      </div>
    </div>
  </div>, document.body);
}
export default function Courses() {
  const { t, i18n } = useTranslation();
  const data = t('courses.items', { returnObjects: true });
  const courses = Array.isArray(data) ? data as Course[] : [];
  const [selected, setSelected] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressed = useRef<CourseId | null>(null);
  const clearHover = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } };
  useEffect(() => () => clearHover(), []);
  const open = (index: number) => { clearHover(); setSelected(index); };
  const close = () => { if (selected !== null) suppressed.current = courses[selected]?.id || null; clearHover(); setSelected(null); };
  return <section id="courses" className="scroll-mt-10 bg-gray-50 py-16">
    <motion.div className="container mx-auto px-6" variants={staggerContainer} initial={false} whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
      <div className="mb-12 text-center"><motion.h2 variants={fadeIn} custom={0} className="mb-4 bg-gradient-to-r from-emerald-600 via-violet-600 to-sky-600 bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">{t('courses.title')}</motion.h2><motion.p variants={fadeIn} custom={0.1} className="mx-auto max-w-3xl text-xl text-neutral-600">{t('courses.subtitle')}</motion.p></div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">{courses.map((course, index) => <motion.article key={course.id} variants={fadeIn} custom={0.3 + index * 0.1} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg">
        <div className="relative h-48 overflow-hidden bg-neutral-100"><img src={course.image} alt={course.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" /><div className="absolute left-4 top-4 flex flex-col gap-2"><span className="rounded-full bg-white/95 px-3 py-1 text-sm font-medium text-neutral-800">{course.level}</span><span className="rounded-full bg-emerald-700 px-3 py-1 text-sm font-medium text-white">{course.category}</span></div></div>
        <div className="flex flex-1 flex-col p-6"><h3 className="mb-2 text-xl font-semibold text-neutral-900">{course.title}</h3><p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-600">{course.description}</p><div className="mb-5 flex flex-wrap gap-3 text-sm text-neutral-600"><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{course.duration}</span><span className="inline-flex items-center gap-1.5"><Video className="h-4 w-4" aria-hidden="true" />{t('courses.modal.liveOnline')}</span></div><div className="flex flex-wrap items-end justify-between gap-3"><div>{course.price && <span className="block text-sm text-neutral-500 line-through">{course.regularPrice}</span>}<span className="font-semibold text-rose-700">{course.price || course.regularPrice}</span></div>
          <button type="button" aria-haspopup="dialog" aria-label={`${t('courses.viewCourse')}: ${course.title}`} onClick={() => open(index)} onPointerEnter={event => { if (event.pointerType !== 'mouse' || selected !== null || suppressed.current === course.id) return; clearHover(); const button = event.currentTarget; hoverTimer.current = setTimeout(() => { button.focus({ preventScroll: true }); open(index); }, 500); }} onPointerLeave={clearHover} className={`tap-target inline-flex min-h-11 items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white ${course.buttonBg} ${course.buttonHoverBg}`}>
            {t('courses.viewCourse')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div></div>
      </motion.article>)}</div>
    </motion.div>
    {selected !== null && courses[selected] && COURSE_IDS.includes(courses[selected].id) && <CourseDetailsModal key={`${courses[selected].id}:${i18n.language}`} course={courses[selected]} onClose={close} />}
  </section>;
}
