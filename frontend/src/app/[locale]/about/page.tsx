import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";

export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AboutContent />;
}

function AboutContent() {
  const t = useTranslations("About");

  return (
    <section className="bg-surface-light py-20">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h1 className="text-4xl font-bold text-text-on-light">{t("title")}</h1>
          <p className="mt-6 text-lg text-text-muted">{t("intro")}</p>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="mt-12 text-2xl font-semibold text-text-on-light">{t("philosophyTitle")}</h2>
          <p className="mt-3 text-text-muted">{t("philosophy")}</p>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="mt-12 text-2xl font-semibold text-text-on-light">{t("focusTitle")}</h2>
          <p className="mt-3 text-text-muted">{t("focus")}</p>
        </Reveal>
      </div>
    </section>
  );
}
