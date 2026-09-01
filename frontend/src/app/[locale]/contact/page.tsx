import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { DemoRequestForm } from "@/components/DemoRequestForm";

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactPageContent />;
}

function ContactPageContent() {
  const t = useTranslations("Contact");

  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-3 text-brand-900/70">{t("subtitle")}</p>
      <p className="mt-2 text-sm text-brand-900/50">{t("sameFormNotice")}</p>
      <div className="mt-10">
        <Suspense fallback={null}>
          <DemoRequestForm />
        </Suspense>
      </div>
    </section>
  );
}
