import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { testimonialsData } from "@/lib/data";

interface TestimonialProps {
  imageSrc: string;
  name: string;
  position: string;
  company: string;
  location: string;
  text: string;
}

const Testimonial = ({ 
  imageSrc, 
  name, 
  position, 
  company, 
  location, 
  text 
}: TestimonialProps) => (
  <div className="bg-white rounded-xl shadow-md p-8 md:p-10 border border-gray-100 h-full">
    <div className="flex flex-col md:flex-row md:items-center mb-6">
      <div className="w-16 h-16 rounded-full bg-gray-200 mb-4 md:mb-0 md:mr-6 flex-shrink-0 overflow-hidden">
        <img 
          src={imageSrc} 
          alt={name} 
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
        <p className="text-gray-600">{position}, {company}</p>
      </div>
    </div>
    <div className="mb-6">
      <div className="flex mb-2">
        {Array(5).fill(0).map((_, i) => (
          <Star key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" />
        ))}
      </div>
    </div>
    <p className="text-gray-700 text-lg italic leading-relaxed mb-6">{text}</p>
    <div className="flex items-center">
      <p className="text-gray-500 font-bold">{company}, {location}</p>
    </div>
  </div>
);

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleTestimonials, setVisibleTestimonials] = useState(3);
  const [numSlides, setNumSlides] = useState(0);

  // Calculate how many slides we'll need based on visible testimonials per slide
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setVisibleTestimonials(3);
      } else if (window.innerWidth >= 768) {
        setVisibleTestimonials(2);
      } else {
        setVisibleTestimonials(1);
      }
    };

    handleResize(); // Call once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate number of slides needed
  useEffect(() => {
    setNumSlides(Math.ceil(testimonialsData.length / visibleTestimonials));
  }, [visibleTestimonials]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % numSlides);
    }, 8000);
    
    return () => clearInterval(timer);
  }, [numSlides]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + numSlides) % numSlides);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % numSlides);
  };

  // Generate indicator dots for the carousel
  const renderIndicators = () => {
    return Array.from({ length: numSlides }).map((_, idx) => (
      <button
        key={idx}
        onClick={() => setCurrentIndex(idx)}
        className={`w-3 h-3 rounded-full mx-1 transition-all duration-300 ${
          idx === currentIndex ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
        }`}
        aria-label={`Go to slide ${idx + 1}`}
      />
    ));
  };

  return (
    <section id="customers" className="py-16 bg-blue-50">
      <motion.div 
        className="container mx-auto px-4 md:px-6"
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
            What Our Clients Say
          </motion.h2>
          <motion.p 
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Hear from organizations that have transformed their operations with our AI solutions.
          </motion.p>
        </div>
        
        <motion.div 
          variants={fadeIn}
          custom={0.3}
          className="relative mx-auto"
        >
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {Array.from({ length: numSlides }).map((_, slideIdx) => (
                <div key={slideIdx} className="w-full flex-shrink-0 px-4">
                  <div className={`grid grid-cols-1 md:grid-cols-${visibleTestimonials > 1 ? '2' : '1'} lg:grid-cols-${visibleTestimonials} xl:grid-cols-${visibleTestimonials} gap-6 h-full`}>
                    {testimonialsData
                      .slice(
                        slideIdx * visibleTestimonials,
                        slideIdx * visibleTestimonials + visibleTestimonials
                      )
                      .map((testimonial, idx) => (
                        <div key={idx} className="h-full pb-2">
                          <Testimonial 
                            imageSrc={testimonial.imageSrc}
                            name={testimonial.name}
                            position={testimonial.position}
                            company={testimonial.company}
                            location={testimonial.location}
                            text={testimonial.text}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Carousel controls */}
          <div className="flex flex-col items-center mt-10">
            <div className="flex justify-center mb-6">
              {renderIndicators()}
            </div>
            
            <div className="flex justify-center">
              <button 
                onClick={handlePrev}
                className="w-12 h-12 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 mr-4 shadow-sm transition-all hover:-translate-x-1"
                aria-label="Previous testimonials"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button 
                onClick={handleNext}
                className="w-12 h-12 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm transition-all hover:translate-x-1"
                aria-label="Next testimonials"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Testimonials;
