// Motion optimized variants for Framer Motion
export const motionOptimized = {
  variants: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  }
} as const

export const motion = motionOptimized // Sidebar import alias
