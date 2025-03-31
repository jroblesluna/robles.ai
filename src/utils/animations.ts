import { Variants } from "framer-motion";

export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: custom,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export const slideInFromLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -50,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};

export const slideInFromRight: Variants = {
  hidden: {
    opacity: 0,
    x: 50,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};
