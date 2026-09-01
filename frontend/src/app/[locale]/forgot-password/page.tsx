import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForgotPasswordForm />;
}
