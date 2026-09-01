"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthApiError } from "@/lib/authApi";
import { FormField } from "@/components/FormField";

export function LoginForm() {
  const t = useTranslations("Auth.login");
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = searchParams.get("reason");
  const returnUrl = searchParams.get("returnUrl");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      router.replace(returnUrl && returnUrl.startsWith("/") ? returnUrl : "/account");
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        setError(t("invalidCredentials"));
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

      {reason === "session_expired" && (
        <p role="status" className="mt-4 rounded-md bg-brand-50 p-3 text-sm text-brand-900">
          {t("sessionExpired")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label={t("email")} name="email" type="email" autoComplete="email" required />
        <FormField
          label={t("password")}
          name="password"
          type="password"
          autoComplete="current-password"
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

      <div className="mt-6 flex justify-between text-sm text-brand-900/70">
        <Link href="/forgot-password" className="hover:text-brand-600">
          {t("forgotPassword")}
        </Link>
        <span>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-brand-700 hover:text-brand-600">
            {t("registerLink")}
          </Link>
        </span>
      </div>
    </div>
  );
}
