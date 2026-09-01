import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { DemoRequestForm } from "@/components/DemoRequestForm";

export default async function DemoPage({
  params,
}: PageProps<"/[locale]/demo">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DemoPageContent />;
}

function DemoPageContent() {
  const t = useTranslations("Demo");

  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-3 text-brand-900/70">{t("subtitle")}</p>
      <div className="mt-10">
        <Suspense fallback={null}>
          <DemoRequestForm />
        </Suspense>
      </div>
    </section>
  );
}
