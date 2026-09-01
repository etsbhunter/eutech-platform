"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { CataloguePlan, fetchCatalogue } from "@/lib/catalogueApi";
import { hardNavigate } from "@/lib/navigate";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { DURATION } from "@/lib/motionConfig";

type Interval = "MONTHLY" | "ANNUAL";

function formatPrice(amountMinorUnits: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amountMinorUnits / 100,
  );
}

export function ProductPlans({ productSlug }: { productSlug: string }) {
  const t = useTranslations("ProductPlans");
  const locale = useLocale();
  const { status, user, authenticatedFetch } = useAuth();
  const router = useRouter();

  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [plans, setPlans] = useState<CataloguePlan[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [checkoutState, setCheckoutState] = useState<{
    planSlug: string | null;
    error: string | null;
  }>({ planSlug: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchCatalogue(productSlug)
      .then((data) => {
        if (!cancelled) setPlans(data.plans);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  async function handleChoosePlan(planSlug: string) {
    if (planSlug === "enterprise") {
      router.push(`/contact?product=${encodeURIComponent(productSlug)}`);
      return;
    }

    if (status !== "authenticated") {
      router.push(`/register?returnUrl=${encodeURIComponent(`/products/${productSlug}`)}`);
      return;
    }

    const organizationId = user?.organizations?.[0]?.id;
    if (!organizationId) {
      setCheckoutState({ planSlug, error: t("needsOrganization") });
      return;
    }

    setCheckoutState({ planSlug, error: null });
    try {
      const response = await authenticatedFetch("/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, productSlug, planSlug, interval }),
      });
      if (!response.ok) {
        throw new Error("checkout failed");
      }
      const body = (await response.json()) as { data: { url: string } };
      hardNavigate(body.data.url);
    } catch {
      setCheckoutState({ planSlug: null, error: t("checkoutError") });
    }
  }

  return (
    <section className="bg-surface-light py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold text-text-on-light">{t("title")}</h2>
          <p className="mt-3 text-text-muted">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-brand-200 bg-brand-50 p-1">
            <button
              type="button"
              onClick={() => setInterval("MONTHLY")}
              aria-pressed={interval === "MONTHLY"}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                interval === "MONTHLY" ? "bg-brand-600 text-white" : "text-text-on-light"
              }`}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              onClick={() => setInterval("ANNUAL")}
              aria-pressed={interval === "ANNUAL"}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                interval === "ANNUAL" ? "bg-brand-600 text-white" : "text-text-on-light"
              }`}
            >
              {t("annual")}
            </button>
          </div>
        </div>

        {interval === "ANNUAL" && (
          <p className="mt-3 text-center text-xs text-text-muted">{t("annualNote")}</p>
        )}

        {loadError && (
          <p role="alert" className="mt-10 text-center text-sm text-red-600">
            {t("loadError")}
          </p>
        )}

        {!plans && !loadError && (
          <p className="mt-10 text-center text-sm text-text-muted">{t("loading")}</p>
        )}

        {plans && (
          <StaggerGroup className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const isFeatured = index === 1;
              const isEnterprise = plan.slug === "enterprise";
              const price = plan.prices.find((p) => p.interval === interval);
              const copy = t.raw(`plans.${plan.slug}`) as { name: string; description: string };

              return (
                <StaggerItem
                  key={plan.slug}
                  className={`rounded-xl border p-8 ${
                    isFeatured
                      ? "border-brand-500 shadow-lg ring-1 ring-brand-500"
                      : "border-border-light"
                  }`}
                >
                  <h3 className="text-xl font-semibold text-text-on-light">{copy.name}</h3>
                  <p className="mt-2 text-sm text-text-muted">{copy.description}</p>
                  <p className="mt-6 text-3xl font-bold text-text-on-light">
                    {isEnterprise || !price ? (
                      t("contactSales")
                    ) : (
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={interval}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: DURATION.micro }}
                          className="inline-block"
                        >
                          {formatPrice(price.amountMinorUnits, price.currency, locale)}
                          <span className="text-base font-normal">{t("perMonth")}</span>
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-text-on-light/80">
                    {plan.features.map((feature) => (
                      <li key={feature.slug} className="flex justify-between gap-2">
                        <span className="flex gap-2">
                          <span aria-hidden className="text-brand-600">
                            ✓
                          </span>
                          {t(`features.${feature.slug}`)}
                        </span>
                        <span className="font-medium text-text-on-light">{feature.value}</span>
                      </li>
                    ))}
                  </ul>

                  {isEnterprise ? (
                    <Link
                      href={`/contact?product=${encodeURIComponent(productSlug)}`}
                      className="mt-8 block rounded-md border border-border-light px-4 py-2.5 text-center text-sm font-semibold text-text-on-light transition-colors hover:bg-brand-50"
                    >
                      {t("contactSales")}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleChoosePlan(plan.slug)}
                      disabled={checkoutState.planSlug === plan.slug}
                      className={`mt-8 w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold transition-colors disabled:opacity-60 ${
                        isFeatured
                          ? "bg-brand-600 text-white hover:bg-brand-700"
                          : "border border-border-light text-text-on-light hover:bg-brand-50"
                      }`}
                    >
                      {checkoutState.planSlug === plan.slug ? t("startingCheckout") : t("choosePlan")}
                    </button>
                  )}
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}

        {checkoutState.error && (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {checkoutState.error}
          </p>
        )}

        <p className="mt-10 text-center text-xs text-text-muted">{t("placeholderNotice")}</p>
      </div>
    </section>
  );
}
