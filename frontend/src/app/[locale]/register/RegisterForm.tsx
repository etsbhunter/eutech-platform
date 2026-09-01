"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthApiError } from "@/lib/authApi";
import { FormField } from "@/components/FormField";

export function RegisterForm() {
  const t = useTranslations("Auth.register");
  const { register } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setSubmitting(true);
    setError(null);
    try {
      await register({ fullName, email, password });
      router.replace("/account");
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 409) {
        setError(t("emailExists"));
      } else {
        setError(t("genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-2 text-brand-900/70">{t("subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label={t("fullName")} name="fullName" autoComplete="name" required />
        <FormField label={t("email")} name="email" type="email" autoComplete="email" required />
        <FormField
          label={t("password")}
          name="password"
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

      <p className="mt-6 text-center text-sm text-brand-900/70">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:text-brand-600">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
