"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/motionConfig";

type RevealProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
};

// Single-element scroll reveal. Uses whileInView (IntersectionObserver under
// the hood, per Requirement 5) and animates only transform+opacity. `once`
// is true so a section never re-triggers work after its first reveal.
export function Reveal({ children, delay = 0, y = 24, className, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: DURATION.reveal, delay, ease: EASE_OUT }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
