import { setRequestLocale } from "next-intl/server";
import { AdminGuard } from "./AdminGuard";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminGuard>{children}</AdminGuard>;
}
