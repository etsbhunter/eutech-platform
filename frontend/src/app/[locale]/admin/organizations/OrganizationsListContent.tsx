"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

type OrganizationRow = {
  id: string;
  name: string;
  country: string | null;
  ownerEmail: string | null;
  subscriptionStatus: string | null;
  provisioningStatus: string;
};

const PAGE_SIZE = 20;

export function OrganizationsListContent() {
  const t = useTranslations("Admin.organizations");
  const { authenticatedFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [result, setResult] = useState<{ items: OrganizationRow[]; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ skip: String(skip), take: String(PAGE_SIZE) });
    if (search) params.set("search", search);

    authenticatedFetch(`/admin/organizations?${params.toString()}`)
      .then((res) => res.json())
      .then((body: { data: { items: OrganizationRow[]; total: number } }) => {
        if (!cancelled) setResult(body.data);
      })
      .catch(() => {
        /* left blank on the page if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, [search, skip, authenticatedFetch]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">{t("title")}</h1>

      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setSkip(0);
        }}
        placeholder={t("searchPlaceholder")}
        className="mt-6 w-full max-w-md rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-100 text-brand-900/60">
            <tr>
              <th className="py-2">{t("name")}</th>
              <th className="py-2">{t("owner")}</th>
              <th className="py-2">{t("subscription")}</th>
              <th className="py-2">{t("provisioning")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {result?.items.map((org) => (
              <tr key={org.id} className="border-b border-brand-50">
                <td className="py-2 font-medium text-brand-900">{org.name}</td>
                <td className="py-2">{org.ownerEmail ?? "–"}</td>
                <td className="py-2">{org.subscriptionStatus ?? "–"}</td>
                <td className="py-2">{org.provisioningStatus}</td>
                <td className="py-2 text-right">
                  <Link href={`/admin/organizations/${org.id}`} className="text-brand-600 hover:underline">
                    {t("view")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between text-sm">
        <button
          type="button"
          onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
          disabled={skip === 0}
          className="text-brand-700 hover:underline disabled:text-brand-900/30"
        >
          {t("prev")}
        </button>
        <button
          type="button"
          onClick={() => setSkip(skip + PAGE_SIZE)}
          disabled={!result || skip + PAGE_SIZE >= result.total}
          className="text-brand-700 hover:underline disabled:text-brand-900/30"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
