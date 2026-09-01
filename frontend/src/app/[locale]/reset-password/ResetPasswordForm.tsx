"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { resetPasswordRequest } from "@/lib/authApi";
import { FormField } from "@/components/FormField";

export function ResetPasswordForm() {
  const t = useTranslations("Auth.resetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");

    setSubmitting(true);
    setError(null);
    try {
      await resetPasswordRequest({ token, newPassword });
      setSuccess(true);
    } catch {
      setError(t("invalidToken"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20">
        <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
        <p role="alert" className="mt-6 text-red-600">
          {t("missingToken")}
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-600">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  if (success) {
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField
          label={t("newPassword")}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          helpText={t("passwordHelp")}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
