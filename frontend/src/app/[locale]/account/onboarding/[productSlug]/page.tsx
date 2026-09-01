import { setRequestLocale } from "next-intl/server";
import { OnboardingContent } from "./OnboardingContent";

export default async function OnboardingPage({
  params,
}: PageProps<"/[locale]/account/onboarding/[productSlug]">) {
  const { locale, productSlug } = await params;
  setRequestLocale(locale);
  return <OnboardingContent productSlug={productSlug} />;
}
