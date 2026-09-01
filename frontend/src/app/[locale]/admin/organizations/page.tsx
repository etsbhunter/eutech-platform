import { setRequestLocale } from "next-intl/server";
import { OrganizationsListContent } from "./OrganizationsListContent";

export default async function AdminOrganizationsPage({
  params,
}: PageProps<"/[locale]/admin/organizations">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrganizationsListContent />;
}
