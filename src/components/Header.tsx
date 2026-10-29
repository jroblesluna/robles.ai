import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage, staticPagePath } from '@shared/seoPolicy';

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

  const href = (destination: string) => {
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
      { label: t('nav.solutions'), href: '/#solutions' }, { label: t('nav.customers'), href: '/#case-studies' },
      { label: t('nav.careers'), href: '/careers' },
    ] },
    { id: 'resources', label: t('nav.resources'), links: [
      { label: t('nav.caseStudies'), href: '/#case-studies' }, { label: t('nav.courses'), href: '/#courses' },
      { label: t('nav.blog'), href: '/blog' },
    ] },
    { id: 'language', label: t('nav.language'), links: [
      { label: '🇺🇸 English', href: languageHref('en'), lang: 'en' }, { label: '🇪🇸 Español', href: languageHref('es'), lang: 'es' },
    ] },
  ];
  const close = () => { setOpenMenu(null); setIsMobileMenuOpen(false); };
  const linkClass = 'tap-target rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 px-3 py-2';
  const links = (group: typeof groups[number]) => group.links.map(link => (
    <a key={link.label} href={group.id === 'language' ? link.href : href(link.href)}
      hrefLang={'lang' in link ? link.lang : undefined} onClick={close}
      className={`${linkClass} flex w-full justify-start`}>{link.label}</a>
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
        <nav aria-label={t('nav.primaryLabel')} className="hidden xl:flex items-center gap-4">
          {groups.map(group => (
            <div key={group.id} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenMenu(current => current === group.id ? null : current); }}>
              <button id={`nav-toggle-${group.id}`} type="button" aria-expanded={openMenu === group.id}
                aria-controls={`nav-panel-${group.id}`} onClick={() => setOpenMenu(current => current === group.id ? null : group.id)}
                className="tap-target gap-1 text-gray-700 whitespace-nowrap">
                {group.label}<ChevronDown aria-hidden="true" className="w-4 h-4" />
              </button>
              <div id={`nav-panel-${group.id}`} hidden={openMenu !== group.id}
                className="absolute top-full left-0 w-48 bg-white border rounded-md shadow-lg p-1">{links(group)}</div>
            </div>
          ))}
          <a href={href('/demos')} onClick={close} className="tap-target gap-2 px-3 rounded-md text-gray-700 hover:bg-gray-100 whitespace-nowrap"><FlaskConical aria-hidden="true" className="h-4 w-4" />{t('nav.demos')}</a>
          <a href={href('/diagnostico-ia')} onClick={close} className="tap-target gap-2 px-3 rounded-md text-gray-700 hover:bg-gray-100"><span>{t("nav.quiz_1")}</span></a>
          <a href={href('/#contact')} onClick={close} className="tap-target px-4 rounded-md bg-blue-600 text-white whitespace-nowrap">{t('nav.contact')}</a>
        </nav>
        <button ref={mobileToggle} type="button" aria-label={t('nav.toggleMenu')} aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="tap-target xl:hidden">
          {isMobileMenuOpen ? <X aria-hidden="true" className="h-7 w-7" /> : <Menu aria-hidden="true" className="h-7 w-7" />}
        </button>
      </div>
      {isMobileMenuOpen && <nav id="mobile-navigation" aria-label={t('nav.primaryLabel')} className="xl:hidden absolute left-0 w-full bg-white overflow-y-auto p-6 space-y-5"
        style={{ top: 'var(--header-h)', maxHeight: 'calc(100dvh - var(--header-h))' }}>
        {groups.map(group => <div key={group.id} className="rounded-xl border p-3"><h2 className="font-semibold mb-2">{group.label}</h2>{links(group)}</div>)}
        <a href={href('/demos')} onClick={close} className={`${linkClass} flex`}>{t('nav.demos')}</a>
        <a href={href('/diagnostico-ia')} onClick={close} className={`${linkClass} flex`}>{t("nav.quiz_1")}</a>
        <a href={href('/#contact')} onClick={close} className="tap-target w-full bg-blue-600 text-white rounded-md">{t('nav.contact')}</a>
      </nav>}
    </header>
  );
}
