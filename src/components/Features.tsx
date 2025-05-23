import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { motion } from "framer-motion";
import { Lightbulb, Shield, Zap, Award } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  iconBgColor, 
  iconColor, 
  delay 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  iconBgColor: string, 
  iconColor: string, 
  delay: number 
}) => (
  <motion.div 
    variants={fadeIn}
    custom={delay}
    className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
  >
    <div className={`w-16 h-16 ${iconBgColor} rounded-lg flex items-center justify-center mb-6`}>
      <div className={`${iconColor}`}>
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </motion.div>
);

const Features = () => {
  const { t, i18n } = useTranslation();

  const features = useMemo(() => [
    {
      title: t("features.items.innovation.title"),
      description: t("features.items.innovation.description"),
      icon: <Lightbulb className="h-8 w-8" />,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: t("features.items.ethics.title"),
      description: t("features.items.ethics.description"),
      icon: <Shield className="h-8 w-8" />,
      iconBgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: t("features.items.rapid.title"),
      description: t("features.items.rapid.description"),
      icon: <Zap className="h-8 w-8" />,
      iconBgColor: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: t("features.items.expertise.title"),
      description: t("features.items.expertise.description"),
      icon: <Award className="h-8 w-8" />,
      iconBgColor: "bg-amber-100",
      iconColor: "text-amber-600",
    }
  ], [i18n.language, t]);

  return (
    <section id="features" className="py-16 bg-gray-50 scroll-mt-10">
      <motion.div 
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="text-center mb-16">
          <motion.h2 
            variants={fadeIn}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {t("features.title")}Robles<span className="text-blue-600">.AI</span>?
          </motion.h2>
          <motion.p 
            variants={fadeIn}
            custom={0.2}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("features.subtitle")}
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              iconBgColor={feature.iconBgColor}
              iconColor={feature.iconColor}
              delay={0.3 + index * 0.1}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Features;
