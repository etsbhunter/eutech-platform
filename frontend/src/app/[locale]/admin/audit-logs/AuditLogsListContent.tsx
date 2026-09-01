"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";

type AuditLogRow = {
  id: string;
  action: string;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

export function AuditLogsListContent() {
  const t = useTranslations("Admin.auditLogs");
  const { authenticatedFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [result, setResult] = useState<{ items: AuditLogRow[]; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ skip: String(skip), take: String(PAGE_SIZE) });
    if (search) params.set("search", search);

    authenticatedFetch(`/admin/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((body: { data: { items: AuditLogRow[]; total: number } }) => {
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
              <th className="py-2">{t("action")}</th>
              <th className="py-2">{t("target")}</th>
              <th className="py-2">{t("when")}</th>
            </tr>
          </thead>
          <tbody>
            {result?.items.map((row) => (
              <tr key={row.id} className="border-b border-brand-50">
                <td className="py-2 font-medium text-brand-900">{row.action}</td>
                <td className="py-2 text-brand-900/70">
                  {row.targetType ? `${row.targetType}:${row.targetId}` : "–"}
                </td>
                <td className="py-2 text-brand-900/60">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
