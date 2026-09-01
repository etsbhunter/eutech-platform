import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
