"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { FormField } from "@/components/FormField";

type OrganizationDetail = {
  id: string;
  name: string;
  country: string | null;
  memberships: { role: string; user: { email: string; fullName: string } }[];
  productProfiles: { product: { name: string }; data: Record<string, unknown> }[];
  subscriptions: {
    status: string;
    plan: { name: string; product: { name: string } };
    price: { interval: string };
    createdAt: string;
  }[];
  entitlements: {
    id: string;
    isManualOverride: boolean;
    reason: string | null;
    expiresAt: string | null;
  }[];
  productInstances: {
    product: { slug: string; name: string };
    provisioningStatus: string;
    workspaceId: string | null;
    accessUrl: string | null;
    failureReason: string | null;
  }[];
};

export function OrganizationDetailContent({ organizationId }: { organizationId: string }) {
  const t = useTranslations("Admin.organizationDetail");
  const { authenticatedFetch } = useAuth();
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);
  const [grantMessage, setGrantMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    const res = await authenticatedFetch(`/admin/organizations/${organizationId}`);
    return ((await res.json()) as { data: OrganizationDetail }).data;
  }, [organizationId, authenticatedFetch]);

  useEffect(() => {
    let cancelled = false;
    loadDetail()
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        /* left blank on the page if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, [loadDetail]);

  async function load() {
    setDetail(await loadDetail());
  }

  async function handleRetry(productSlug: string) {
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await authenticatedFetch(
        `/admin/organizations/${organizationId}/provisioning/retry?product=${encodeURIComponent(productSlug)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("retry failed");
      setRetryMessage(t("retrySuccess"));
      await load();
    } catch {
      setRetryMessage(t("retryError"));
    } finally {
      setRetrying(false);
    }
  }

  async function handleGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "");
    const expiresAt = String(form.get("expiresAt") ?? "");

    setGranting(true);
    setGrantMessage(null);
    try {
      const res = await authenticatedFetch(`/admin/organizations/${organizationId}/entitlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, expiresAt: new Date(expiresAt).toISOString() }),
      });
      if (!res.ok) throw new Error("grant failed");
      setGrantMessage(t("grantSuccess"));
      (event.target as HTMLFormElement).reset();
      await load();
    } catch {
      setGrantMessage(t("grantError"));
    } finally {
      setGranting(false);
    }
  }

  if (!detail) return null;

  const failedInstances = detail.productInstances.filter((pi) => pi.provisioningStatus === "FAILED");

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">
        {t("title")}: {detail.name}
      </h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-800">{t("members")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {detail.memberships.map((m) => (
            <li key={m.user.email} className="flex justify-between">
              <span>{m.user.email}</span>
              <span className="text-brand-900/60">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-800">{t("productProfile")}</h2>
        {detail.productProfiles.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm text-brand-900/80">
            {detail.productProfiles.map((profile, i) => (
              <li key={i}>
                <span className="font-medium text-brand-900">{profile.product.name}: </span>
                {Object.entries(profile.data)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ") || "—"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-900/60">{t("noProductProfile")}</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-800">{t("subscriptions")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {detail.subscriptions.map((s, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {s.plan.product.name} — {s.plan.name} ({s.price.interval})
              </span>
              <span className="text-brand-900/60">{s.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-800">{t("entitlements")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {detail.entitlements.map((e) => (
            <li key={e.id} className="flex justify-between">
              <span>{e.isManualOverride ? `${t("manualOverride")}: ${e.reason}` : "—"}</span>
              <span className="text-brand-900/60">
                {t("expires")}: {e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : t("neverExpires")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-lg border border-brand-100 p-6">
        <h2 className="text-lg font-semibold text-brand-800">{t("provisioningHeading")}</h2>
        {failedInstances.length > 0 ? (
          failedInstances.map((instance) => (
            <div key={instance.product.slug} className="mt-3">
              <p className="text-sm font-medium text-brand-900">{instance.product.name}</p>
              <p className="text-sm text-red-600">{instance.failureReason}</p>
              <button
                type="button"
                onClick={() => handleRetry(instance.product.slug)}
                disabled={retrying}
                className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {retrying ? t("retrying") : t("retryProvisioning")}
              </button>
            </div>
          ))
        ) : (
          <p className="mt-3 text-sm text-brand-900/60">{t("noFailedProvisioning")}</p>
        )}
        {retryMessage && <p className="mt-3 text-sm text-brand-900/80">{retryMessage}</p>}
      </section>

      <section className="mt-8 rounded-lg border border-brand-100 p-6">
        <h2 className="text-lg font-semibold text-brand-800">{t("grantEntitlement")}</h2>
        <form onSubmit={handleGrant} className="mt-4 space-y-4">
          <FormField label={t("reason")} name="reason" required />
          <FormField label={t("expiresAt")} name="expiresAt" type="date" required />
          <button
            type="submit"
            disabled={granting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {granting ? t("granting") : t("grant")}
          </button>
        </form>
        {grantMessage && <p className="mt-3 text-sm text-brand-900/80">{grantMessage}</p>}
      </section>
    </div>
  );
}
