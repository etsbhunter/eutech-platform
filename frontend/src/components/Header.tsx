"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { DURATION, EASE_OUT } from "@/lib/motionConfig";

export function Header() {
  const t = useTranslations("Header");
  const tAdmin = useTranslations("Admin");
  const { status, user, logout } = useAuth();
  const isAdmin = user?.organizations?.some((org) => org.role === "EUTECH_INTERNAL_ADMIN") ?? false;

  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  // useScroll + useMotionValueEvent batches reads into framer-motion's own
  // rAF loop rather than an unthrottled scroll listener (Requirement 5).
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setCompact(latest > 24);
  });

  // Focus trap + Escape-to-close + focus-return for the mobile menu
  // (Requirement 6 / QA scenario 9).
  useEffect(() => {
    if (!menuOpen) return;

    const panel = menuPanelRef.current;

    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled])',
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const navLinks = [
    { href: "/products", label: t("products") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <motion.header
      animate={{
        paddingTop: compact ? 12 : 20,
        paddingBottom: compact ? 12 : 20,
      }}
      transition={{ duration: DURATION.micro, ease: EASE_OUT }}
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        compact
          ? "border-border-light bg-white/95 shadow-sm"
          : "border-transparent bg-white/70"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          Eutech
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-text-on-light)] md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative py-1 hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {status === "authenticated" ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="text-sm font-medium hover:text-brand-600">
                  {tAdmin("navLabel")}
                </Link>
              )}
              <Link href="/account" className="text-sm font-medium hover:text-brand-600">
                {t("myAccount")}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm font-medium hover:text-brand-600"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium hover:text-brand-600">
              {t("login")}
            </Link>
          )}
          <Link
            href="/demo"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            {t("bookDemo")}
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-on-light)] md:hidden"
        >
          <span className="sr-only">{menuOpen ? t("closeMenu") : t("openMenu")}</span>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            ref={menuPanelRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DURATION.micro, ease: EASE_OUT }}
            className="overflow-hidden border-t border-border-light bg-white md:hidden"
          >
            <nav className="flex flex-col gap-1 px-6 py-4 text-sm font-medium text-[var(--color-text-on-light)]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 hover:bg-brand-50"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t border-border-light" />
              {status === "authenticated" ? (
                <>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-md px-2 py-2 hover:bg-brand-50"
                    >
                      {tAdmin("navLabel")}
                    </Link>
                  )}
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 hover:bg-brand-50"
                  >
                    {t("myAccount")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="rounded-md px-2 py-2 text-left hover:bg-brand-50"
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 hover:bg-brand-50"
                >
                  {t("login")}
                </Link>
              )}
              <Link
                href="/demo"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-md bg-brand-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-700"
              >
                {t("bookDemo")}
              </Link>
              <div className="mt-2">
                <LanguageSwitcher />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
