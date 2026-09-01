"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "@/i18n/navigation";
import { DURATION, EASE_OUT } from "@/lib/motionConfig";
import type { ReactNode } from "react";

// Wraps <main>'s children only -- Header/Footer are never remounted, so
// this never interferes with the app-wide AuthProvider, route guards, or
// Next.js's own built-in route announcer (App Router already handles
// screen-reader navigation announcements; this component doesn't touch it).
//
// mode="popLayout" takes the exiting page out of document flow (position:
// absolute) the instant the new page enters, so the incoming page occupies
// its final position immediately -- content is interactive right away, per
// Requirement 4C ("navigation must occur immediately"), instead of waiting
// for a sequential exit-then-enter (which mode="wait" would produce).
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DURATION.route, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
