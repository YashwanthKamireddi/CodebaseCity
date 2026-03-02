export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: 'easeInOut' }
}

export const slideUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 20, opacity: 0 },
  transition: { type: 'spring', damping: 20, stiffness: 300 }
}

export const slideDown = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
  transition: { type: 'spring', damping: 20, stiffness: 300 }
}

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { type: 'spring', damping: 25, stiffness: 300 }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
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
