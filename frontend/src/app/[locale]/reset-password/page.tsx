import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
