import { motion } from "framer-motion";
import { Cpu, Eye, MessageSquare, BarChart3 } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { solutionsData } from "@/lib/data";

interface SolutionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  linkColor: string;
  linkHoverColor: string;
  image: string | any; // Allow imported image sources
  index: number;
}

const iconAnimation = {
  hidden: { scale: 1 },
  hover: { 
    scale: 1.2,
    rotate: 5,
    transition: { duration: 0.3, type: "spring", stiffness: 200 }
  }
};

const SolutionCard = ({
  icon,
  title,
  description,
  color,
  bgColor,
  linkColor,
  linkHoverColor,
  image,
  index
}: SolutionCardProps) => (
  <motion.div 
    variants={fadeIn}
    custom={0.3 + index * 0.1}
    className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
    whileHover="hover"
    initial="hidden"
    animate="visible"
  >
    <div className={`h-48 ${bgColor} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-40 group-hover:opacity-20 transition-opacity duration-300">
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          className="h-24 w-24 text-white drop-shadow-lg"
          variants={iconAnimation}
        >
          {icon}
        </motion.div>
      </div>
    </div>
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <a href="#" className={`${linkColor} font-bold ${linkHoverColor} flex items-center transition-all duration-300 group-hover:translate-x-1`}>
        Learn more
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  </motion.div>
);

const Solutions = () => {
  // Map icons to the data
  const iconComponents = {
    "Cpu": <Cpu className="w-full h-full" />,
    "Eye": <Eye className="w-full h-full" />,
    "MessageSquare": <MessageSquare className="w-full h-full" />,
    "BarChart3": <BarChart3 className="w-full h-full" />
  };

  return (
    <section id="solutions" className="py-16 bg-blue-50">
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
            Our AI Solutions
          </motion.h2>
          <motion.p 
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Discover how our expertise in AI, machine learning, and computer vision can transform your business operations.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {solutionsData.map((solution, index) => (
            <SolutionCard
              key={solution.title}
              icon={iconComponents[solution.icon as keyof typeof iconComponents]}
              title={solution.title}
              description={solution.description}
              color={solution.color}
              bgColor={solution.bgColor}
              linkColor={solution.linkColor}
              linkHoverColor={solution.linkHoverColor}
              image={"/images/"+solution.image}
              index={index}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Solutions;
