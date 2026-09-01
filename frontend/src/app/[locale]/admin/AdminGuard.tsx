"use client";

import { ReactNode, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

export function AdminGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("Admin");
  const { status, user } = useAuth();
  const router = useRouter();

  const isAdmin = user?.organizations?.some((org) => org.role === "EUTECH_INTERNAL_ADMIN") ?? false;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?returnUrl=/admin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="mx-auto max-w-3xl px-6 py-20 text-center text-brand-900/70">{t("loading")}</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-brand-900/70">{t("accessDenied")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav className="mb-8 flex flex-wrap gap-4 border-b border-brand-100 pb-4 text-sm font-medium text-brand-900">
        <Link href="/admin" className="hover:text-brand-600">
          {t("nav.dashboard")}
        </Link>
        <Link href="/admin/organizations" className="hover:text-brand-600">
          {t("nav.organizations")}
        </Link>
        <Link href="/admin/demo-requests" className="hover:text-brand-600">
          {t("nav.demoRequests")}
        </Link>
        <Link href="/admin/audit-logs" className="hover:text-brand-600">
          {t("nav.auditLogs")}
        </Link>
        <Link href="/admin/webhook-events" className="hover:text-brand-600">
          {t("nav.webhookEvents")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
