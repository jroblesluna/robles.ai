import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
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
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  let hoverTimeout: NodeJS.Timeout;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false); // Cierra el menú móvil al entrar en vista escritorio
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  interface NavLink {
    id: string;
    label: string;
    href?: string;
    children?: { id: string; label: string; href?: string }[];
  }

  const navLinks: NavLink[] = [
    {
      id: "company",
      label: t("nav.company"), // Nuevo agrupador "Company"
      children: [
        { id: "features", label: t("nav.features") },
        { id: "about", label: t("nav.about") },
        { id: "solutions", label: t("nav.solutions") },
        { id: "customers", label: t("nav.customers") },
        { id: "careers", href: "/careers", label: t("nav.careers") },
      ],
    },
    {
      id: "resources",
      label: t("nav.resources"), // Nuevo agrupador "Resources"
      children: [
        { id: "case-studies", label: t("nav.caseStudies") },
        { id: "courses", label: t("nav.courses") },
        { id: "blog", href: "/blog", label: t("nav.blog") },
      ],
    },
    {
      id: "language",
      label: t("nav.language"), // Nuevo agrupador "Language"
      children: [
        { id: "en", label: "🇺🇸 English" },
        { id: "es", label: "🇪🇸 Español" },
      ],
    },
  ];

  const handleNavigation = (idOrPath: string) => {
    if (idOrPath.startsWith("/")) {
      if (window.location.pathname === idOrPath) {
        // Ya estás en la misma página
        window.scrollTo({ top: 0, behavior: "smooth" });
        //history.replaceState(null, "", "/");
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

  const handleMouseEnter = (id: string) => {
    clearTimeout(hoverTimeout); // cancela el cierre si regresa el mouse
    setHoveredMenu(id);
  };

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => {
      setHoveredMenu(null);
    }, 200); // da 200ms al usuario para bajar el mouse
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${isScrolled ? "shadow-sm" : ""}`}>
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <button onClick={() => handleNavigation("/")} className="flex items-center space-x-3 focus:outline-none">
            <img src="/favicon.svg" alt="Robles.AI Logo" className="w-10 h-10" />
            <span className="text-xl font-bold text-gray-900">
              Robles<span className="text-blue-500">.AI</span>
            </span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
          {navLinks.map((link) =>
            link.children ? (
              <div
                key={link.id}
                className="relative z-50"
                onMouseEnter={() => handleMouseEnter(link.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className="flex items-center gap-1 text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap"
                >
                  {link.label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transform transition-transform duration-300 ${hoveredMenu === link.id ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Dropdown */}
                <div
                  className={`absolute top-full left-0 mt-2 w-40 bg-white border rounded-md shadow-lg transform origin-top transition-all duration-200 z-50 ${hoveredMenu === link.id
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-95 pointer-events-none"
                    }`}
                >   {link.children.map((sublink) => (
                  <button
                    key={sublink.id}
                    onClick={() =>
                      link.id === "language"
                        ? i18n.changeLanguage(sublink.id)
                        : handleNavigation(sublink.href || sublink.id)
                    }
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    {sublink.label}
                  </button>


                ))}
                </div>

              </div>
            ) : (
              <button
                key={link.id}
                onClick={() => handleNavigation(link.href || link.id)}
                className="text-gray-700 hover:text-blue-600 whitespace-nowrap transition-colors"
              >
                {link.label}
              </button>
            )
          )}
          {/* Contact Button */}
          <button
            onClick={() => handleNavigation("contact")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors hover:-translate-y-1 hover:shadow-md whitespace-nowrap"
          >
            {t("nav.contact")}
          </button>
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-7 w-7 text-gray-700" />
            ) : (
              <Menu className="h-7 w-7 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-white z-40 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-start justify-start pt-8 px-6 space-y-1"
            >
              {navLinks.map((link) => (
                <div key={link.id} className="w-full">
                  {!link.children ? (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleNavigation(link.href || link.id);
                      }}
                      className="block w-full text-left text-base text-gray-800 hover:text-blue-600 py-2"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <div className="mt-2">
                      <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                        {link.label}
                      </div>
                      <div className="flex flex-col space-y-2 pl-3">
                        {link.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              handleNavigation(child.href || child.id);
                            }}
                            className="text-base text-gray-700 hover:text-blue-600 text-left"
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Idioma */}
              <div className="flex space-x-4 pt-6">
                <button onClick={() => i18n.changeLanguage("es")} className="text-sm hover:text-blue-600">
                  🇪🇸 Español
                </button>
                <button onClick={() => i18n.changeLanguage("en")} className="text-sm hover:text-blue-600">
                  🇺🇸 English
                </button>
              </div>

              {/* Contacto */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleNavigation("contact");
                }}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                {t("nav.contact")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;