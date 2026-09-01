"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export function FakePortalContent() {
  const t = useTranslations("FakeBillingPortal");
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-4 text-sm text-brand-900/70">{t("description")}</p>
      {customerId && (
        <p className="mt-6 text-xs text-brand-900/50">Customer: {customerId}</p>
      )}
    </div>
  );
}
