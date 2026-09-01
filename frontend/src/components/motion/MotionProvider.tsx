"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// reducedMotion="user" makes every motion.* component in the tree
// automatically respect the OS/browser prefers-reduced-motion setting --
// transform-based animations are disabled while opacity fades (needed for
// content to still appear) are kept. This is the app-wide baseline for
// Requirement 6; individual components only need extra handling for
// decorative-only effects that MotionConfig doesn't cover (e.g. CSS
// keyframe backgrounds), which are gated separately with the
// useReducedMotion hook where used.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
