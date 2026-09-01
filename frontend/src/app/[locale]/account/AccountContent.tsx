"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { FormField } from "@/components/FormField";
import { hardNavigate } from "@/lib/navigate";

type SubscriptionSummary = {
  productSlug: string;
  productName: string;
  status: string;
  planSlug: string;
  planName: string;
  interval: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasActiveEntitlement: boolean;
};

type ProvisioningSummary = {
  status: "NOT_STARTED" | "QUEUED" | "PROVISIONING" | "READY" | "FAILED" | "SUSPENDED";
  workspaceId: string | null;
  accessUrl: string | null;
  failureReason: string | null;
};

function WorkspaceBlock({
  organizationId,
  subscription,
  authenticatedFetch,
}: {
  organizationId: string;
  subscription: SubscriptionSummary;
  authenticatedFetch: ReturnType<typeof useAuth>["authenticatedFetch"];
}) {
  const t = useTranslations("Account");
  const [provisioning, setProvisioning] = useState<ProvisioningSummary | null>(null);
  const [retrying, setRetrying] = useState(false);
  const productQuery = `?product=${encodeURIComponent(subscription.productSlug)}`;

  useEffect(() => {
    if (!subscription.hasActiveEntitlement) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await authenticatedFetch(
          `/organizations/${organizationId}/provisioning${productQuery}`,
        );
        const body = (await res.json()) as { data: ProvisioningSummary };
        if (cancelled) return;
        setProvisioning(body.data);
        if (body.data.status === "QUEUED" || body.data.status === "PROVISIONING") {
          timer = setTimeout(poll, 2500);
        }
      } catch {
        /* provisioning status is a non-critical enhancement to this page */
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, subscription.hasActiveEntitlement, subscription.productSlug, authenticatedFetch]);

  async function handleRetryProvisioning() {
    setRetrying(true);
    try {
      const response = await authenticatedFetch(
        `/organizations/${organizationId}/provisioning${productQuery}`,
        { method: "POST" },
      );
      const body = (await response.json()) as { data: ProvisioningSummary };
      setProvisioning(body.data);
    } catch {
      /* leave prior state visible; the poll effect will pick it back up */
    } finally {
      setRetrying(false);
    }
  }

  if (!subscription.hasActiveEntitlement) return null;

  return (
    <div className="mt-6 rounded-lg border border-brand-100 p-8">
      <h2 className="text-xl font-semibold text-brand-800">
        {t("workspace.heading", { product: subscription.productName })}
      </h2>

      {(!provisioning || provisioning.status === "NOT_STARTED") && (
        <div className="mt-4">
          <p className="text-sm text-brand-900/70">{t("workspace.notStarted")}</p>
          <Link
            href={`/account/onboarding/${subscription.productSlug}`}
            className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t("workspace.startOnboarding")}
          </Link>
        </div>
      )}

      {provisioning && (provisioning.status === "QUEUED" || provisioning.status === "PROVISIONING") && (
        <p role="status" className="mt-4 text-sm text-brand-900/70">
          {t("workspace.provisioning")}
        </p>
      )}

      {provisioning?.status === "READY" && provisioning.accessUrl && (
        <div className="mt-4">
          <p className="text-sm text-brand-900/70">{t("workspace.ready")}</p>
          <a
            href={provisioning.accessUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t("workspace.openWorkspace")}
          </a>
        </div>
      )}

      {provisioning?.status === "FAILED" && (
        <div className="mt-4">
          <p role="alert" className="text-sm text-red-600">
            {t("workspace.failed")}
          </p>
          <button
            type="button"
            onClick={handleRetryProvisioning}
            disabled={retrying}
            className="mt-4 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {t("workspace.retry")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountContent() {
  const t = useTranslations("Account");
  const { status, user, authenticatedFetch, refreshUser } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[] | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?returnUrl=/account");
    }
  }, [status, router]);

  const primaryOrganizationId = user?.organizations?.[0]?.id;

  useEffect(() => {
    if (!primaryOrganizationId) return;
    let cancelled = false;
    authenticatedFetch(`/organizations/${primaryOrganizationId}/subscription`)
      .then((res) => res.json())
      .then((body: { data: SubscriptionSummary[] }) => {
        if (!cancelled) setSubscriptions(body.data);
      })
      .catch(() => {
        /* subscription status is a non-critical enhancement to this page */
      });
    return () => {
      cancelled = true;
    };
  }, [primaryOrganizationId, authenticatedFetch]);

  async function handleOpenPortal() {
    if (!primaryOrganizationId) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const response = await authenticatedFetch("/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: primaryOrganizationId }),
      });
      if (!response.ok) throw new Error("portal failed");
      const body = (await response.json()) as { data: { url: string } };
      hardNavigate(body.data.url);
    } catch {
      setPortalError(t("subscription.portalError"));
      setPortalLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-brand-900/70">
        {t("loading")}
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return null;
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const country = String(form.get("country") ?? "") || undefined;

    setSubmitting(true);
    setError(null);
    try {
      const response = await authenticatedFetch("/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country }),
      });
      if (!response.ok) {
        throw new Error("Failed to create organization");
      }
      await refreshUser();
    } catch {
      setError(t("noOrganization.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const organizations = user.organizations ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-2 text-brand-900/70">{t("welcome", { name: user.fullName })}</p>

      {organizations.length === 0 ? (
        <div className="mt-10 rounded-lg border border-brand-100 p-8">
          <h2 className="text-xl font-semibold text-brand-800">{t("noOrganization.title")}</h2>
          <p className="mt-2 text-sm text-brand-900/70">{t("noOrganization.description")}</p>

          <form onSubmit={handleCreateOrganization} className="mt-6 space-y-5">
            <FormField label={t("noOrganization.name")} name="name" required />
            <FormField label={t("noOrganization.country")} name="country" />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? t("noOrganization.submitting") : t("noOrganization.submit")}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="mt-10 rounded-lg border border-brand-100 p-8">
            <h2 className="text-xl font-semibold text-brand-800">{t("organization.heading")}</h2>
            <ul className="mt-4 space-y-3">
              {organizations.map((org) => (
                <li key={org.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-brand-900">{org.name}</span>
                  <span className="text-brand-900/60">
                    {t("organization.role")}: {org.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-lg border border-brand-100 p-8">
            <h2 className="text-xl font-semibold text-brand-800">{t("subscription.heading")}</h2>

            {subscriptions && subscriptions.length > 0 ? (
              <div className="mt-4 space-y-5 text-sm">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.productSlug}
                    className="space-y-2 border-b border-brand-100 pb-4 last:border-0 last:pb-0"
                  >
                    <p>
                      <span className="font-medium text-brand-900">{subscription.productName}</span>
                      {" — "}
                      {subscription.planName} ({subscription.interval})
                    </p>
                    <p>
                      <span className="font-medium text-brand-900">{t("subscription.status")}: </span>
                      {subscription.status}
                    </p>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="mt-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {portalLoading ? t("subscription.openingPortal") : t("subscription.manageBilling")}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-brand-900/70">{t("subscription.noActiveSubscription")}</p>
                <Link
                  href="/products"
                  className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {t("subscription.viewPlans")}
                </Link>
              </div>
            )}

            {portalError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {portalError}
              </p>
            )}
          </div>

          {subscriptions?.map((subscription) => (
            <WorkspaceBlock
              key={subscription.productSlug}
              organizationId={primaryOrganizationId!}
              subscription={subscription}
              authenticatedFetch={authenticatedFetch}
            />
          ))}
        </>
      )}
    </div>
  );
}
