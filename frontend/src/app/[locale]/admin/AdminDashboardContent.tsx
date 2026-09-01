"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

type DashboardCounts = {
  demoRequests: number;
  trialing: number;
  active: number;
  pastDue: number;
  provisioningFailed: number;
};

export function AdminDashboardContent() {
  const t = useTranslations("Admin.dashboard");
  const { authenticatedFetch } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    authenticatedFetch("/admin/dashboard")
      .then((res) => res.json())
      .then((body: { data: DashboardCounts }) => {
        if (!cancelled) setCounts(body.data);
      })
      .catch(() => {
        /* dashboard counts are a non-critical enhancement */
      });
    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch]);

  const tiles: { label: string; value: number | null }[] = [
    { label: t("demoRequests"), value: counts?.demoRequests ?? null },
    { label: t("trialing"), value: counts?.trialing ?? null },
    { label: t("active"), value: counts?.active ?? null },
    { label: t("pastDue"), value: counts?.pastDue ?? null },
    { label: t("provisioningFailed"), value: counts?.provisioningFailed ?? null },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">{t("title")}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-brand-100 p-6 text-center">
            <p className="text-3xl font-bold text-brand-900">{tile.value ?? "–"}</p>
            <p className="mt-2 text-sm text-brand-900/70">{tile.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
