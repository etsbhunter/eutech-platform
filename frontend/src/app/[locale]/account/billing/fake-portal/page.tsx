import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { FakePortalContent } from "./FakePortalContent";

export default async function FakePortalPage({
  params,
}: PageProps<"/[locale]/account/billing/fake-portal">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <FakePortalContent />
    </Suspense>
  );
}
