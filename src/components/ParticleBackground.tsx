import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mousePosition = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number>(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles.current = [];
      const particleCount = Math.min(Math.floor(window.innerWidth / 10), 100);
      
      for (let i = 0; i < particleCount; i++) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosition.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    // Draw a single frame. When `move` is false (reduced motion) the particles
    // stay put and no mouse-connection lines are drawn — a static backdrop.
    const drawFrame = (move: boolean) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.current.forEach((particle, index) => {
        if (move) {
          // Move particles
          particle.x += particle.speedX;
          particle.y += particle.speedY;

          // Wrap around edges
          if (particle.x < 0) particle.x = canvas.width;
          if (particle.x > canvas.width) particle.x = 0;
          if (particle.y < 0) particle.y = canvas.height;
          if (particle.y > canvas.height) particle.y = 0;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 183, 255, ${particle.opacity})`;
        ctx.fill();
        
        // Connect particles within a certain distance
        for (let j = index + 1; j < particles.current.length; j++) {
          const dx = particles.current[j].x - particle.x;
          const dy = particles.current[j].y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(124, 183, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particles.current[j].x, particles.current[j].y);
            ctx.stroke();
          }
        }
        
        // Connect to mouse position (skipped in the static, reduced-motion frame)
        if (move) {
          const dx = mousePosition.current.x - particle.x;
          const dy = mousePosition.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(124, 183, 255, ${0.2 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mousePosition.current.x, mousePosition.current.y);
            ctx.stroke();
          }
        }
      });

      if (move) {
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    const animate = () => drawFrame(true);

    resizeCanvas();

    if (reduceMotion) {
      // Reduced motion: render one static frame, no rAF loop, no mouse tracking.
      const staticResize = () => {
        resizeCanvas();
        drawFrame(false);
      };
      drawFrame(false);
      window.addEventListener('resize', staticResize);
      return () => {
        window.removeEventListener('resize', staticResize);
      };
    }

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [reduceMotion]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default ParticleBackground;