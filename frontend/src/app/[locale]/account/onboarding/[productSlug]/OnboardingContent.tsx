"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { FormField } from "@/components/FormField";
import { getProductProfileSchema } from "@/lib/productProfileSchemas";
import { getProductContentNamespace } from "@/lib/productContent";

export function OnboardingContent({ productSlug }: { productSlug: string }) {
  const t = useTranslations("Onboarding");
  const { status, user, authenticatedFetch } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const namespace = getProductContentNamespace(productSlug);
  const schema = getProductProfileSchema(productSlug);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?returnUrl=/account/onboarding/${productSlug}`);
    }
  }, [status, router, productSlug]);

  const organizationId = user?.organizations?.[0]?.id;

  useEffect(() => {
    if (status === "authenticated" && !organizationId) {
      router.replace("/account");
    }
  }, [status, organizationId, router]);

  if (!namespace) {
    notFound();
  }

  if (status !== "authenticated" || !organizationId) {
    return null;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data: Record<string, string | number> = {};
    for (const field of schema.fields) {
      const raw = String(form.get(field.key) ?? "").trim();
      if (!raw) continue;
      data[field.key] = field.type === "number" ? Number(raw) : raw;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/organizations/${organizationId}/products/${productSlug}/profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      if (!response.ok) throw new Error("save failed");
      setSaved(true);
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestProvisioning() {
    setRequesting(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/organizations/${organizationId}/provisioning?product=${encodeURIComponent(productSlug)}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("provisioning request failed");
      router.push("/account");
    } catch {
      setError(t("error"));
      setRequesting(false);
    }
  }

  const productTitle = t(`products.${namespace}.title`);
  const productSubtitle = t(`products.${namespace}.subtitle`);

  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{productTitle}</h1>
      <p className="mt-2 text-brand-900/70">{productSubtitle}</p>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        {schema.fields.map((field) => (
          <FormField
            key={field.key}
            label={t(`fields.${field.labelKey}`)}
            name={field.key}
            type={field.type === "number" ? "number" : "text"}
            min={field.min}
          />
        ))}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </form>

      {saved && (
        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-6">
          <p className="text-sm text-brand-900">{t("saved")}</p>
          <button
            type="button"
            onClick={handleRequestProvisioning}
            disabled={requesting}
            className="mt-4 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {requesting ? t("requesting") : t("requestProvisioning")}
          </button>
        </div>
      )}

      <Link href="/account" className="mt-6 inline-block text-sm text-brand-900/70 hover:text-brand-600">
        {t("backToAccount")}
      </Link>
    </div>
  );
}
