"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

type DemoRequestRow = {
  id: string;
  fullName: string;
  businessEmail: string;
  companyName: string;
  productSlug: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

export function DemoRequestsListContent() {
  const t = useTranslations("Admin.demoRequests");
  const { authenticatedFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [result, setResult] = useState<{ items: DemoRequestRow[]; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ skip: String(skip), take: String(PAGE_SIZE) });
    if (search) params.set("search", search);

    authenticatedFetch(`/admin/demo-requests?${params.toString()}`)
      .then((res) => res.json())
      .then((body: { data: { items: DemoRequestRow[]; total: number } }) => {
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
              <th className="py-2">{t("email")}</th>
              <th className="py-2">{t("company")}</th>
              <th className="py-2">{t("product")}</th>
              <th className="py-2">{t("submitted")}</th>
            </tr>
          </thead>
          <tbody>
            {result?.items.map((row) => (
              <tr key={row.id} className="border-b border-brand-50">
                <td className="py-2 font-medium text-brand-900">{row.fullName}</td>
                <td className="py-2">{row.businessEmail}</td>
                <td className="py-2">{row.companyName}</td>
                <td className="py-2">{row.productSlug ?? t("generalInquiry")}</td>
                <td className="py-2 text-brand-900/60">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
