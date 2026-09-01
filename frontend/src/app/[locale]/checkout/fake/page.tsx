import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { FakeCheckoutContent } from "./FakeCheckoutContent";

export default async function FakeCheckoutPage({
  params,
}: PageProps<"/[locale]/checkout/fake">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <FakeCheckoutContent />
    </Suspense>
  );
}
