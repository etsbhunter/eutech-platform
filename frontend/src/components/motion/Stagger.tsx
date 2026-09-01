"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { DURATION, EASE_OUT, STAGGER_GAP } from "@/lib/motionConfig";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER_GAP },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.reveal, ease: EASE_OUT },
  },
};

// Parent: triggers once when ~30% in view, then staggers each StaggerItem
// child via variant propagation (no per-item IntersectionObserver needed).
export function StaggerGroup({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={itemVariants} className={className} {...rest}>
      {children}
    </motion.div>
  );
}
