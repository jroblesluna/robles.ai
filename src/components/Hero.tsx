import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/utils/animations";
import ParticleBackground from './ParticleBackground';
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden animated-bg py-5 md:py-8"
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <ParticleBackground />
        <div className="absolute inset-0 z-10 mix-blend-overlay">
          <svg className="w-full h-full opacity-30" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tech-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
            <circle cx="500" cy="500" r="300" fill="none" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="10" />
            <circle cx="500" cy="500" r="200" fill="none" stroke="rgba(59, 130, 246, 0.8)" strokeWidth="10" />
            <circle cx="500" cy="500" r="100" fill="none" stroke="rgba(59, 130, 246, 1)" strokeWidth="10" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1 
            variants={fadeIn}
            custom={0}
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]"
          >
            {t("hero.title")}
          </motion.h1>

          <motion.p 
            variants={fadeIn}
            custom={0.2}
            className="text-sm md:text-xl text-white mb-4 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div 
            variants={fadeIn}
            custom={0.4}
            className="flex flex-row justify-center gap-4"
          >
            <a 
              href="#features" 
              className="px-4 py-2 mb-4 bg-white text-blue-700 font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {t("hero.cta1")}
            </a>
            <a 
              href="/blog" 
              className="px-4 py-2 mb-4 bg-blue-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20"
            >
              {t("hero.cta2")}
            </a>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </motion.section>
  );
};

export default Hero;
