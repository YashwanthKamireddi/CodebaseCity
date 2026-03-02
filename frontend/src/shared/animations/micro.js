export const pulse = {
  initial: { opacity: 0.5, scale: 0.98 },
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [0.98, 1.02, 0.98],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity
    }
  }
}

export const rotateContinuous = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 8,
      ease: "linear",
      repeat: Infinity
    }
  }
}

export const shimmer = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear'
    }
  }
}
