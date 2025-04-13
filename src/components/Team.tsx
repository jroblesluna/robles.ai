import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";

interface TeamMemberProps {
  image: string;
  name: string;
  position: string;
  positionColor: string;
  bio: string;
  index: number;
}

const TeamMember = ({
  image,
  name,
  position,
  positionColor,
  bio,
  index
}: TeamMemberProps) => (
  <motion.div 
    variants={fadeIn}
    custom={0.3 + index * 0.1}
    className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100"
  >
    <div className="aspect-square relative overflow-hidden bg-gray-100">
      <img 
        src={`/images/${image}`} 
        alt={name} 
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
    </div>
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-1">{name}</h3>
      <p className={`${positionColor} font-medium mb-4`}>{position}</p>
      <p className="text-gray-600 mb-4 text-sm leading-relaxed">{bio}</p>
    </div>
  </motion.div>
);

const Team = () => {
  const { t } = useTranslation();
  const members = t("team.members", { returnObjects: true }) as TeamMemberProps[];

  return (
    <section id="about" className="py-16 bg-blue-50">
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
            {t("team.title")}
          </motion.h2>
          <motion.p 
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("team.subtitle")}
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {members.map((member: any, index: number) => (
            <TeamMember
              key={index}
              image={member.image}
              name={member.name}
              position={member.position}
              positionColor={member.positionColor}
              bio={member.bio}
              index={index}
            />
          ))}
        </div>
        
        <motion.div 
          variants={fadeIn}
          custom={0.7}
          className="mt-16 text-center"
        >
          <a 
            href="#" 
            className="inline-flex items-center bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {t("team.join")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Team;
