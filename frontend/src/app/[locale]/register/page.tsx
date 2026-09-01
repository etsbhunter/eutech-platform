import { setRequestLocale } from "next-intl/server";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  params,
}: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RegisterForm />;
}
