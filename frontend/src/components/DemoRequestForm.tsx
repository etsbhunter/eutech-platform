"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ApiError, submitDemoRequest } from "@/lib/api";
import { FormField } from "./FormField";

type Status = "idle" | "submitting" | "success" | "error";

export function DemoRequestForm() {
  const t = useTranslations("Demo");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const fullName = String(form.get("fullName") ?? "").trim();
    const businessEmail = String(form.get("businessEmail") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const companyName = String(form.get("companyName") ?? "").trim();
    const branchCountRaw = String(form.get("branchCount") ?? "").trim();
    const preferredContactMethod = String(form.get("preferredContactMethod") ?? "EMAIL") as
      | "EMAIL"
      | "PHONE";
    const message = String(form.get("message") ?? "").trim();
    const consent = form.get("consent") === "on";
    // Honeypot: real visitors never see or fill this field.
    const website = String(form.get("website") ?? "");

    const nextErrors: Record<string, string> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fullName) nextErrors.fullName = t("validation.required");
    if (!businessEmail || !emailPattern.test(businessEmail)) {
      nextErrors.businessEmail = t("validation.email");
    }
    if (!phone) nextErrors.phone = t("validation.required");
    if (!companyName) nextErrors.companyName = t("validation.required");
    if (!consent) nextErrors.consent = t("validation.consent");

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setStatus("submitting");
    try {
      await submitDemoRequest({
        fullName,
        businessEmail,
        phone,
        companyName,
        productSlug: searchParams.get("product") ?? undefined,
        branchCount: branchCountRaw ? Number(branchCountRaw) : undefined,
        preferredContactMethod,
        message: message || undefined,
        consent,
        utmSource: searchParams.get("utm_source") ?? undefined,
        utmMedium: searchParams.get("utm_medium") ?? undefined,
        utmCampaign: searchParams.get("utm_campaign") ?? undefined,
        website: website || undefined,
      });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        // Normalized error, nothing sensitive to surface beyond a generic message.
      }
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-brand-200 bg-brand-50 p-6 text-brand-900"
      >
        <p className="font-semibold">{t("successTitle")}</p>
        <p className="mt-2 text-sm text-brand-900/80">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot field: hidden from real users via layout, not display:none, to
          discourage bots that skip hidden-but-styled fields. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <FormField label={t("fields.fullName")} name="fullName" error={errors.fullName} required />
      <FormField
        label={t("fields.businessEmail")}
        name="businessEmail"
        type="email"
        error={errors.businessEmail}
        required
      />
      <FormField label={t("fields.phone")} name="phone" type="tel" error={errors.phone} required />
      <FormField label={t("fields.companyName")} name="companyName" error={errors.companyName} required />
      <FormField
        label={t("fields.branchCount")}
        name="branchCount"
        type="number"
        min={1}
        error={errors.branchCount}
      />

      <div>
        <span className="block text-sm font-medium text-brand-900">
          {t("fields.preferredContactMethod")}
        </span>
        <div className="mt-2 flex gap-6 text-sm text-brand-900/80">
          <label className="flex items-center gap-2">
            <input type="radio" name="preferredContactMethod" value="EMAIL" defaultChecked />
            {t("fields.email")}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="preferredContactMethod" value="PHONE" />
            {t("fields.phoneMethod")}
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-brand-900">
          {t("fields.message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm text-brand-900/80">
          <input type="checkbox" name="consent" className="mt-1" />
          {t("fields.consent")}
        </label>
        {errors.consent && <p className="mt-1 text-sm text-red-600">{errors.consent}</p>}
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {t("errorBody")}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
