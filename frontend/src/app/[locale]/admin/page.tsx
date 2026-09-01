import { setRequestLocale } from "next-intl/server";
import { AdminDashboardContent } from "./AdminDashboardContent";

export default async function AdminDashboardPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminDashboardContent />;
}
