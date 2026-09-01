import { setRequestLocale } from "next-intl/server";
import { AuditLogsListContent } from "./AuditLogsListContent";

export default async function AdminAuditLogsPage({
  params,
}: PageProps<"/[locale]/admin/audit-logs">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuditLogsListContent />;
}
