"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { forgotPasswordRequest } from "@/lib/authApi";
import { FormField } from "@/components/FormField";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");

    setSubmitting(true);
    try {
      await forgotPasswordRequest(email);
    } finally {
      // Always show the same generic confirmation, whether or not the
      // request succeeded technically -- no account-existence signal leaks.
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20">
        <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
        <p role="status" className="mt-6 text-brand-900/80">
          {t("successMessage")}
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-600">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-2 text-brand-900/70">{t("subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label={t("email")} name="email" type="email" autoComplete="email" required />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>

      <Link href="/login" className="mt-6 inline-block text-sm text-brand-900/70 hover:text-brand-600">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
