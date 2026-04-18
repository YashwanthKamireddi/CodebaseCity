export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] }
}

export const slideUp = {
  initial: { y: 16, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 16, opacity: 0 },
  transition: { type: 'spring', damping: 26, stiffness: 340, mass: 0.8 }
}

export const slideDown = {
  initial: { y: -16, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -16, opacity: 0 },
  transition: { type: 'spring', damping: 26, stiffness: 340, mass: 0.8 }
}

export const scaleIn = {
  initial: { scale: 0.96, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.96, opacity: 0 },
  transition: { type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }
}

export const slideRight = {
  initial: { x: '100%', opacity: 0.7 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0.7 },
  transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    }
  }
}

export const getReducedMotionVariants = (variants, shouldReduceMotion) => {
  if (!shouldReduceMotion) return variants;

  // If reduced motion is preferred, strip out transforms and stick to opacity
  return {
    ...variants,
    initial: { opacity: variants.initial?.opacity ?? 0 },
    animate: { opacity: variants.animate?.opacity ?? 1, transition: { duration: 0.1 } },
    exit: { opacity: variants.exit?.opacity ?? 0, transition: { duration: 0.1 } }
  };
}
