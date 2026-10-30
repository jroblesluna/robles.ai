import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown, ChevronRight, FlaskConical, ClipboardCheck, Newspaper, Sparkles, Users, Lightbulb, Building2, Briefcase, FileText, GraduationCap, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { normalizeLanguage, staticPagePath } from '@shared/seoPolicy';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const mobileMenu = {
  closed: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' as const } },
  open: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT, staggerChildren: 0.05, delayChildren: 0.04 } },
};
const mobileMenuItem = {
  closed: { opacity: 0, y: -6 },
  open: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};
const MOBILE_LINK_ICONS: Record<string, LucideIcon> = {
  '/#features': Sparkles, '/#about': Users, '/#solutions': Lightbulb, '/#clients': Building2, '/careers': Briefcase,
  '/#case-studies': FileText, '/#courses': GraduationCap, '/blog': Newspaper,
};
// Inline SVG, not emoji: Windows renders flag emoji as the letters "US" / "ES".
const FLAG_CLASS = 'h-3.5 w-5 shrink-0 rounded-[2px]';
const FLAGS = {
  en: <svg aria-hidden="true" viewBox="0 0 19 13" className={FLAG_CLASS}><rect width="19" height="13" fill="#B22234" /><path d="M0 1.5h19M0 3.5h19M0 5.5h19M0 7.5h19M0 9.5h19M0 11.5h19" stroke="#fff" /><rect width="8" height="7" fill="#3C3B6E" /></svg>,
  es: <svg aria-hidden="true" viewBox="0 0 3 2" className={FLAG_CLASS}><rect width="3" height="2" fill="#AA151B" /><rect y="0.5" width="3" height="1" fill="#F1BF00" /></svg>,
};

interface HeaderProps { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (open: boolean) => void }
export default function Header({ isMobileMenuOpen, setIsMobileMenuOpen }: HeaderProps) {
  const { i18n, t } = useTranslation();
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const [, setMetadataVersion] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const observer = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(node =>
        node instanceof Element && node.matches('link[rel="alternate"][hreflang]')))) {
        setMetadataVersion(version => version + 1);
      }
    });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null); };
    const resize = () => { if (window.innerWidth >= 1280) setIsMobileMenuOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', closeOutside); window.removeEventListener('resize', resize); };
  }, [setIsMobileMenuOpen]);

  // Locked on <html>: its overflow-x guard makes it the viewport scroller, so body overflow would do nothing.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const href =(destination: string) => {
    const [path, fragment] = destination.split('#');
    return staticPagePath(path || '/', lang) + (fragment ? `#${fragment}` : '');
  };
  const languageHref = (next: 'en' | 'es') => {
    if (!clientReady) return staticPagePath('/', next);
    if (window.location.pathname.startsWith('/blog/')) {
      const alternate = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${next}"]`);
      if (alternate) { const url = new URL(alternate.href); return url.pathname + url.search; }
    }
    const url = new URL(window.location.href);
    if (next === 'es') url.searchParams.set('lang', 'es'); else url.searchParams.delete('lang');
    return url.pathname + url.search + url.hash;
  };
  const groups = [
    { id: 'company', label: t('nav.company'), links: [
      { label: t('nav.features'), href: '/#features' }, { label: t('nav.about'), href: '/#about' },
      { label: t('nav.solutions'), href: '/#solutions' }, { label: t('nav.customers'), href: '/#clients' },
      { label: t('nav.careers'), href: '/careers' },
    ] },
    { id: 'resources', label: t('nav.resources'), links: [
      { label: t('nav.caseStudies'), href: '/#case-studies' }, { label: t('nav.courses'), href: '/#courses' },
      { label: t('nav.blog'), href: '/blog' },
    ] },
    { id: 'language', label: t('nav.language'), links: [
      { label: 'English', href: languageHref('en'), lang: 'en' as const }, { label: 'Español', href: languageHref('es'), lang: 'es' as const },
    ] },
  ];
  const close = () => { setOpenMenu(null); setIsMobileMenuOpen(false); };
  const linkClass = 'tap-target !justify-start rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 px-3 py-2';
  const links = (group: typeof groups[number]) => group.links.map(link => (
    <a key={link.label} href={group.id === 'language' ? link.href : href(link.href)}
      hrefLang={'lang' in link ? link.lang : undefined} onClick={close}
      className={`${linkClass} flex w-full gap-2`}>{'lang' in link && FLAGS[link.lang]}{link.label}</a>
  ));
  return (
    <header ref={rootRef} className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          if (isMobileMenuOpen) { setIsMobileMenuOpen(false); mobileToggle.current?.focus(); }
          else if (openMenu) { rootRef.current?.querySelector<HTMLButtonElement>(`#nav-toggle-${openMenu}`)?.focus(); setOpenMenu(null); }
        }
      }}>
      <div className="container mx-auto px-6 py-3 flex justify-between items-center gap-4">
        <a href={href('/')} onClick={close} data-same-tab className="shrink-0 flex items-center gap-3 rounded-md">
          <img src="/favicon.svg" alt="" className="w-10 h-10" width="40" height="40" />
          <span className="text-xl font-bold text-gray-900">Robles<span className="text-blue-500">.AI</span></span>
        </a>
        <nav aria-label={t('nav.primaryLabel')} className="hidden xl:flex items-center gap-2.5">
          {groups.map(group => (
            <div key={group.id} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenMenu(current => current === group.id ? null : current); }}>
              <button id={`nav-toggle-${group.id}`} type="button" aria-expanded={openMenu === group.id}
                aria-controls={`nav-panel-${group.id}`} onClick={() => setOpenMenu(current => current === group.id ? null : group.id)}
                className="tap-target gap-1 text-gray-700 whitespace-nowrap">
                {group.label}<ChevronDown aria-hidden="true" className="w-4 h-4" />
              </button>
              <div id={`nav-panel-${group.id}`} hidden={openMenu !== group.id}
                className="absolute top-full right-0 w-48 bg-white border rounded-md shadow-lg p-1">{links(group)}</div>
            </div>
          ))}
          <a href={href('/demos')} onClick={close} className="tap-target gap-1.5 px-3 rounded-md text-gray-700 hover:bg-gray-100 whitespace-nowrap"><FlaskConical aria-hidden="true" className="h-4 w-4" />{t('nav.demos')}</a>
          <a href={href('/blog')} onClick={close} className="tap-target gap-1.5 px-3 rounded-md text-gray-700 hover:bg-gray-100 whitespace-nowrap"><Newspaper aria-hidden="true" className="h-4 w-4" />{t('nav.blogShort')}</a>
          <a href={href('/diagnostico-ia')} onClick={close} className="tap-target gap-1.5 px-3 rounded-md text-gray-700 hover:bg-gray-100"><ClipboardCheck aria-hidden="true" className="h-4 w-4" /><span>{t("nav.quiz_1")}</span></a>
          <a href={href('/#contact')} onClick={close} className="tap-target ml-3 px-4 rounded-md bg-blue-600 text-white whitespace-nowrap">{t('nav.contact')}</a>
        </nav>
        <button ref={mobileToggle} type="button" aria-label={t('nav.toggleMenu')} aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="tap-target xl:hidden">
          {isMobileMenuOpen ? <X aria-hidden="true" className="h-7 w-7" /> : <Menu aria-hidden="true" className="h-7 w-7" />}
        </button>
      </div>
      <AnimatePresence>{isMobileMenuOpen && <motion.nav id="mobile-navigation" aria-label={t('nav.primaryLabel')} className="xl:hidden absolute left-0 w-full bg-white flex flex-col border-t"
        style={{ top: 'var(--header-h)', height: 'calc(100dvh - var(--header-h))' }}
        variants={mobileMenu} initial="closed" animate="open" exit="closed">
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          <motion.div variants={mobileMenuItem} className="space-y-2">
            {[
              { label: t('nav.demos'), href: '/demos', Icon: FlaskConical },
              { label: t('nav.quiz_1'), href: '/diagnostico-ia', Icon: ClipboardCheck },
            ].map(({ label, href: destination, Icon }) => (
              <a key={destination} href={href(destination)} onClick={close}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 font-medium text-gray-900 hover:border-blue-300 hover:bg-blue-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className="flex-1">{label}</span>
                <ChevronRight aria-hidden="true" className="h-5 w-5 text-gray-400" />
              </a>
            ))}
          </motion.div>
          {groups.filter(group => group.id !== 'language').map(group => (
            <motion.div key={group.id} variants={mobileMenuItem}>
              <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{group.label}</h2>
              <div className="grid grid-cols-2 gap-2">
                {group.links.map(link => {
                  const Icon = MOBILE_LINK_ICONS[link.href];
                  return (
                    <a key={link.href} href={href(link.href)} onClick={close}
                      className="flex min-h-[52px] items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-700 odd:last:col-span-2">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-blue-600" />{link.label}
                    </a>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div variants={mobileMenuItem} className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          <div role="group" aria-label={t('nav.language')} className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
            {([['en', 'English'], ['es', 'Español']] as const).map(([code, label]) => (
              <a key={code} href={languageHref(code)} hrefLang={code} onClick={close} aria-current={lang === code ? 'true' : undefined}
                className={`tap-target gap-2 rounded-md text-sm ${lang === code ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-600'}`}>{FLAGS[code]}{label}</a>
            ))}
          </div>
          <a href={href('/#contact')} onClick={close} className="tap-target w-full rounded-lg bg-blue-600 font-medium text-white hover:bg-blue-700">{t('nav.contact')}</a>
        </motion.div>
      </motion.nav>}</AnimatePresence>
    </header>
  );
}
