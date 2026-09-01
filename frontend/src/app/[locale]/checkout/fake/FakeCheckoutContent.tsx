"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export function FakeCheckoutContent() {
  const t = useTranslations("FakeCheckout");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "confirming" | "success" | "error">("idle");

  const checkoutId = searchParams.get("checkoutId");
  const organizationId = searchParams.get("organizationId");
  const productSlug = searchParams.get("productSlug");
  const planSlug = searchParams.get("planSlug");
  const interval = searchParams.get("interval");

  async function handleConfirm() {
    if (!checkoutId || !organizationId || !productSlug || !planSlug || !interval) return;
    setStatus("confirming");
    try {
      const response = await fetch(`${API_BASE_URL}/billing/fake/complete-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId, organizationId, productSlug, planSlug, interval }),
      });
      if (!response.ok) throw new Error("failed");
      setStatus("success");
      setTimeout(() => router.push("/account"), 1200);
    } catch {
      setStatus("error");
    }
  }

  if (!checkoutId || !organizationId || !productSlug || !planSlug || !interval) {
    return null;
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-4 text-sm text-brand-900/70">{t("description")}</p>

      <div className="mt-8 space-y-2 rounded-lg border border-brand-100 p-6 text-left text-sm">
        <p>
          <span className="font-medium text-brand-900">{t("product")}: </span>
          {productSlug}
        </p>
        <p>
          <span className="font-medium text-brand-900">{t("plan")}: </span>
          {planSlug}
        </p>
        <p>
          <span className="font-medium text-brand-900">{t("interval")}: </span>
          {interval}
        </p>
      </div>

      {status === "success" && (
        <p role="status" className="mt-6 text-brand-700">
          {t("success")}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="mt-6 text-red-600">
          {t("error")}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={status === "confirming" || status === "success"}
        className="mt-8 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "confirming" ? t("confirming") : t("confirm")}
      </button>
    </div>
  );
}
