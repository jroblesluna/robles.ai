import { useEffect } from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Solutions from "@/components/Solutions";
import CaseStudies from "@/components/CaseStudies";
import Testimonials from "@/components/Testimonials";
import Courses from "@/components/Courses";
import Team from "@/components/Team";
import Contact from "@/components/Contact";

const Home = () => {
  // Smooth scroll functionality
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        
        const targetId = target.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId as string);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.getBoundingClientRect().top + window.scrollY - 80,
            behavior: 'smooth'
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    
    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  return (
    <>
      <Hero />
      <CaseStudies />
      <Solutions />
      <Courses />
      <Testimonials />
      <Features />
      <Team />
      <Contact />
    </>
  );
};

export default Home;
