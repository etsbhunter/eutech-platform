import { setRequestLocale } from "next-intl/server";
import { DemoRequestsListContent } from "./DemoRequestsListContent";

export default async function AdminDemoRequestsPage({
  params,
}: PageProps<"/[locale]/admin/demo-requests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DemoRequestsListContent />;
}
