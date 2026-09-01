"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { DURATION, EASE_OUT } from "@/lib/motionConfig";

const textVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  visualAlt,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  visualAlt: string;
}) {
  return (
    <section className="relative overflow-hidden bg-surface-dark text-text-on-dark">
      {/* Decorative accent only: a static-position radial gradient with a
          slow CSS keyframe drift (GPU-composited transform, no JS). Governed
          by the global prefers-reduced-motion rule in globals.css, which
          collapses animation-duration to ~0 for reduced-motion users. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/3 right-0 h-[140%] w-[70%] animate-[eutech-glow-drift_18s_ease-in-out_infinite] rounded-full bg-brand-600/25 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,var(--color-surface-dark))]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-2 lg:py-32">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.08, delayChildren: 0.05 }}
        >
          <motion.p
            variants={textVariants}
            transition={{ duration: DURATION.reveal, ease: EASE_OUT }}
            className="text-sm font-semibold uppercase tracking-wide text-brand-400"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            variants={textVariants}
            transition={{ duration: DURATION.reveal, ease: EASE_OUT }}
            className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={textVariants}
            transition={{ duration: DURATION.reveal, ease: EASE_OUT }}
            className="mt-4 max-w-xl text-lg text-text-on-dark/80"
          >
            {subtitle}
          </motion.p>
          <motion.div
            variants={textVariants}
            transition={{ duration: DURATION.reveal, ease: EASE_OUT }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Link
              href="/products"
              className="rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              {primaryCta}
            </Link>
            <Link
              href="/products/eutech-clinic"
              className="rounded-md border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {secondaryCta}
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: DURATION.reveal, delay: 0.2, ease: EASE_OUT }}
          role="img"
          aria-label={visualAlt}
          className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-text-on-dark/50 backdrop-blur-sm"
        >
          {visualAlt}
        </motion.div>
      </div>
    </section>
  );
}
