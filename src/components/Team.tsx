import { motion } from "framer-motion";
import { ExternalLink, Linkedin, Mail } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

interface TeamMemberProps {
  contactLabel?: string;
  linkedin?: string;
  email?: string;
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
  linkedin,
  contactLabel,
  email,
  position,
  positionColor,
  bio,
  index
}: TeamMemberProps) => (
  <motion.div 
    variants={fadeIn}
    custom={0.3 + index * 0.1}
    className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col"
  >
    <div className="aspect-square relative overflow-hidden bg-gray-100">
      <img 
        src={`/images/${image}`} 
        alt={name} 
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
    </div>
    <div className="p-6 flex flex-col flex-1">
      <h3 className="text-xl font-semibold text-gray-900 mb-1">{name}</h3>
      <p className={`${positionColor} font-medium mb-4`}>{position}</p>
      <p className="text-gray-600 mb-4 text-sm leading-relaxed flex-1">{bio}</p>
      {(linkedin || email) && (
        <div className="flex gap-2 mt-auto pt-2">
          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-medium transition-colors shadow-sm no-underline">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-sm no-underline">
              <Mail className="w-4 h-4" /> {contactLabel}
            </a>
          )}
        </div>
      )}
    </div>
  </motion.div>
);

const Team = () => {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const members = t("team.members", { returnObjects: true }) as TeamMemberProps[];
  const hiddenMembers = ["Sophia Martinez"];
  const visibleMembers = members.filter((m: any) => !hiddenMembers.includes(m.name));

  return (
    <section id="about" className="py-16 bg-blue-50 scroll-mt-10">
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
        
        <div className={`grid grid-cols-1 gap-8 justify-items-center ${visibleMembers.length <= 3 ? "md:grid-cols-3 max-w-4xl mx-auto" : "md:grid-cols-2 lg:grid-cols-4"}`}>
          {visibleMembers.map((member: any, index: number) => (
            <TeamMember
              key={index}
              image={member.image}
              name={member.name}
              position={member.position}
              positionColor={member.positionColor}
              bio={member.bio}
              linkedin={(member as any).linkedin}
              email={(member as any).email}
              contactLabel={t("team.contactButton")}
              index={index}
            />
          ))}
        </div>
        
        <motion.div 
          variants={fadeIn}
          custom={0.7}
          className="mt-16 text-center"
        >
          <button
            onClick={() => setLocation("/careers")}
            className="inline-flex items-center bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {t("team.join")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Team;
