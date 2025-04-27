import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { fadeIn } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

interface HeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const Header = ({ isMobileMenuOpen, setIsMobileMenuOpen }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { i18n, t } = useTranslation();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigation = (idOrPath: string) => {
    if (idOrPath.startsWith("/")) {
      if (window.location.pathname === idOrPath) {
        // Ya estás en la misma página
        window.scrollTo({ top: 0, behavior: "smooth" });
        history.replaceState(null, "", "/");
      } else {
        // No estás en la misma página
        setLocation(idOrPath);
        if (idOrPath === "/") {
          // Espera un poquito y luego scroll arriba
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            history.replaceState(null, "", "/");
          }, 300); // 🔥 Espera 300ms a que renderice Home
        }
      }
    } else {
      // Anchor interno
      setLocation("/");
      setTimeout(() => {
        const el = document.getElementById(idOrPath);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          history.replaceState(null, "", `#${idOrPath}`);
        }
      }, 100);
    }
  };
  const navLinks = [
    { id: "features", label: t("nav.features") },
    { id: "solutions", label: t("nav.solutions") },
    { id: "case-studies", label: t("nav.caseStudies") },
    { id: "customers", label: t("nav.customers") },
    { id: "courses", label: t("nav.courses") },
    { id: "careers", href: "/careers", label: t("nav.careers") },
    { id: "about", label: t("nav.about") },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${isScrolled ? "shadow-sm" : ""}`}>
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={0}
          className="mr-6"
        >
          <button
            onClick={() => handleNavigation("/")}
            className="flex items-center space-x-3 focus:outline-none"
          >

            {
              /*   
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-violet-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
             */
            }

            <img src="/favicon.svg" alt="Robles.AI Logo" className="w-10 h-10" />

            <span className="text-xl font-bold text-gray-900">
              Robles<span className="text-blue-500">.AI</span>
            </span>
          </button>
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
          {navLinks.map((link, i) => (
            <motion.button
              key={link.id}
              onClick={() => handleNavigation(link.href || link.id)}
              className="text-gray-700 hover:text-blue-600 whitespace-nowrap transition-colors"
              initial="hidden"
              animate="visible"
              layout="position"
              variants={fadeIn}
              custom={i * 0.1 + 0.2}
            >
              {link.label}
            </motion.button>
          ))}

          {/* Language Selector */}
          <motion.div
            className="flex items-center space-x-2"
            initial="hidden"
            animate="visible"
            layout="position"
            variants={fadeIn}
            custom={0.7}
          >
            <button onClick={() => i18n.changeLanguage("es")} className="text-sm hover:text-blue-600">
              🇪🇸 ES
            </button>
            <button onClick={() => i18n.changeLanguage("en")} className="text-sm hover:text-blue-600">
              🇺🇸 EN
            </button>
          </motion.div>

          <motion.button
            onClick={() => handleNavigation("contact")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors hover:-translate-y-1 hover:shadow-md whitespace-nowrap"
            initial="hidden"
            animate="visible"
            layout="position"
            variants={fadeIn}
            custom={0.8}
          >
            {t("nav.contact")}
          </motion.button>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex items-center"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden bg-white border-t border-gray-200 ${isMobileMenuOpen ? "block" : "hidden"}`}>
        <div className="container mx-auto px-4 py-3 space-y-3">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleNavigation(link.href || link.id);
              }}
              className="block text-gray-700 hover:text-blue-600 transition-colors w-full text-left"
            >
              {link.label}
            </button>
          ))}
          {/* Language switcher for mobile */}
          <div className="flex justify-center space-x-4 pt-2">
            <button onClick={() => i18n.changeLanguage("es")} className="text-sm hover:text-blue-600">
              🇪🇸 ES
            </button>
            <button onClick={() => i18n.changeLanguage("en")} className="text-sm hover:text-blue-600">
              🇺🇸 EN
            </button>
          </div>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigation("contact");
            }}
            className="block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors w-full text-center"
          >
            {t("nav.contact")}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
