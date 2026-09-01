import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function SubscriptionTermsPage({
  params,
}: PageProps<"/[locale]/subscription-terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalContent />;
}

function LegalContent() {
  const t = useTranslations("Legal.subscriptionTerms");
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-6 text-brand-900/70">{t("placeholder")}</p>
    </section>
  );
}
