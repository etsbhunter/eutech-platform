import { setRequestLocale } from "next-intl/server";
import { AccountContent } from "./AccountContent";

export default async function AccountPage({
  params,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AccountContent />;
}
