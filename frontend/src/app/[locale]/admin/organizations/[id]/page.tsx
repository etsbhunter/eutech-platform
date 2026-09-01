import { setRequestLocale } from "next-intl/server";
import { OrganizationDetailContent } from "./OrganizationDetailContent";

export default async function AdminOrganizationDetailPage({
  params,
}: PageProps<"/[locale]/admin/organizations/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <OrganizationDetailContent organizationId={id} />;
}
