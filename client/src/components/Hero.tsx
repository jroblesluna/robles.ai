import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/utils/animations";
import ParticleBackground from './ParticleBackground';

const Hero = () => {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden animated-bg py-20 md:py-32"
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Animated particle background */}
        <ParticleBackground />
        
        {/* Digital grid overlay */}
        <div className="absolute inset-0 z-10 mix-blend-overlay">
          <svg className="w-full h-full opacity-30" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tech-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
            <circle cx="500" cy="500" r="300" fill="none" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="1" />
            <circle cx="500" cy="500" r="200" fill="none" stroke="rgba(59, 130, 246, 0.8)" strokeWidth="1" />
            <circle cx="500" cy="500" r="100" fill="none" stroke="rgba(59, 130, 246, 1)" strokeWidth="1" />
          </svg>
        </div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1 
            variants={fadeIn}
            custom={0}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]"
          >
            Robust Artificial Intelligence Solutions
          </motion.h1>
          
          <motion.p 
            variants={fadeIn}
            custom={0.2}
            className="text-xl md:text-2xl text-white mb-8 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
          >
            Transform your business with cutting-edge AI technology that delivers real-world results.
          </motion.p>
          
          <motion.div 
            variants={fadeIn}
            custom={0.4}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <a 
              href="#solutions" 
              className="px-6 py-3 bg-white text-blue-700 font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              Explore Solutions
            </a>
            <a 
              href="#contact" 
              className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20"
            >
              Book a Consultation
            </a>
          </motion.div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </motion.section>
  );
};

export default Hero;
