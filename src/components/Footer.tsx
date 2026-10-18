import { Link } from "wouter";
import { normalizeLanguage, staticPagePath } from '@shared/seoPolicy';
import { useTranslation } from "react-i18next";

const FooterSection = ({ title, links }: { title: string, links: Array<{ name: string, href: string }> }) => (
  <div>
    <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
    <ul className="space-y-2 text-sm">
      {links.map((link) => (
        <li key={link.name}>
          {link.href.includes("#") ? (
            <a href={link.href} className="tap-target justify-start text-gray-400 hover:text-white transition-colors">
              {link.name}
            </a>
          ) : (
            <Link href={link.href} className="tap-target justify-start text-gray-400 hover:text-white transition-colors">
              {link.name}
            </Link>
          )}
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const localizedHref = (href: string) => {
    const [path, fragment] = href.split('#');
    return staticPagePath(path || '/', lang) + (fragment ? `#${fragment}` : '');
  };
  const localizeLinks = (links: Array<{ name: string; href: string }>) => links.map(link => ({ ...link, href: localizedHref(link.href) }));

  const solutionsLinks = [
    { name: t("footer.solutions.diagnosis"), href: "/#solutions" },
    { name: t("footer.solutions.audit"), href: "/#solutions" },
    { name: t("footer.solutions.chatbots"), href: "/#solutions" },
    { name: t("footer.solutions.llm"), href: "/#solutions" },
    { name: t("footer.solutions.rag"), href: "/#solutions" },
    { name: t("footer.solutions.ml"), href: "/#solutions" }
  ];

  const companyLinks = [
    { name: t("footer.company.about"), href: "/#about" },
    { name: t("footer.company.careers"), href: "/careers" },
    { name: t("footer.company.blog"), href: "/blog" },
    { name: t("footer.company.contact"), href: "/#contact" }
  ];



  return (
    <footer className="bg-gray-900 text-white pt-10 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <Link href={localizedHref("/")} className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-lg font-bold text-white">Robles<span className="text-blue-400">.AI</span></span>
            </Link>
            <p className="text-gray-400 text-sm">
              {t("footer.description")}
            </p>
          </div>

          {/* Footer navigation landmark (distinct from the primary nav in the
              Header). `display:contents` keeps the 4-column grid layout intact
              while exposing the link columns as one labeled <nav>. */}
          <nav aria-label={t("nav.footerLabel")} className="contents">
            {/* Solutions */}
            <FooterSection title={t("footer.titles.solutions")} links={localizeLinks(solutionsLinks)} />

            {/* Company */}
            <FooterSection title={t("footer.titles.company")} links={localizeLinks(companyLinks)} />


          </nav>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <p className="text-gray-500 text-sm">© {currentYear} Robles.AI. {t("footer.rights")}</p>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;