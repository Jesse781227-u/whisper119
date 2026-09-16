import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion"
import type { ReactNode } from "react"

export const motionEase = [0.22, 1, 0.36, 1] as const

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: motionEase } },
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
}

export const staggerChildrenVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

export function useMotionVariants(variants: Variants): Variants {
  const prefersReducedMotion = useReducedMotion()
  if (!prefersReducedMotion) return variants

  return {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { duration: 0 } },
  }
}

type RevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode
  delay?: number
}

export function Reveal({ children, delay = 0, variants = fadeUpVariants, ...props }: RevealProps) {
  const resolvedVariants = useMotionVariants(variants)
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={resolvedVariants}
      transition={prefersReducedMotion ? { duration: 0 } : { delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type StaggerProps = HTMLMotionProps<"div"> & {
  children: ReactNode
}

export function Stagger({ children, variants = staggerChildrenVariants, ...props }: StaggerProps) {
  const resolvedVariants = useMotionVariants(variants)

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={resolvedVariants}
      {...props}
    >
      {children}
    </motion.div>
  )
}