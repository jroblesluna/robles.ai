import { Link } from "wouter";
import { Twitter, Linkedin, Github } from "lucide-react";
import { useTranslation } from "react-i18next";

const FooterSection = ({ title, links }: { title: string, links: Array<{ name: string, href: string }> }) => (
  <div>
    <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
    <ul className="space-y-4">
      {links.map((link) => (
        <li key={link.name}>
          <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
            {link.name}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const solutionsLinks = [
    { name: t("footer.solutions.ml"), href: "#" },
    { name: t("footer.solutions.cv"), href: "#" },
    { name: t("footer.solutions.nlp"), href: "#" },
    { name: t("footer.solutions.dl"), href: "#" },
    { name: t("footer.solutions.consulting"), href: "#" }
  ];

  const companyLinks = [
    { name: t("footer.company.about"), href: "#" },
    { name: t("footer.company.careers"), href: "#" },
    { name: t("footer.company.blog"), href: "/blog" },
    { name: t("footer.company.press"), href: "#" },
    { name: t("footer.company.contact"), href: "#contact" }
  ];

  const legalLinks = [
    { name: t("footer.legal.privacy"), href: "#" },
    { name: t("footer.legal.terms"), href: "#" },
    { name: t("footer.legal.cookies"), href: "#" },
    { name: t("footer.legal.ethics"), href: "#" }
  ];

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-white">Robles<span className="text-blue-400">.AI</span></span>
            </Link>
            <p className="text-gray-400 mb-6">
              {t("footer.description")}
            </p>
            <p className="text-gray-400">© {currentYear} Robles.AI. {t("footer.rights")}</p>
          </div>

          {/* Solutions */}
          <FooterSection title={t("footer.titles.solutions")} links={solutionsLinks} />

          {/* Company */}
          <FooterSection title={t("footer.titles.company")} links={companyLinks} />

          {/* Legal */}
          <FooterSection title={t("footer.titles.legal")} links={legalLinks} />
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <p className="text-gray-500 mb-4 md:mb-0">{t("footer.tagline")}</p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;