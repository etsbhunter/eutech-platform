import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hero } from "@/components/home/Hero";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

export default async function HomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Home");
  const valueProps = t.raw("valueProps.items") as { title: string; description: string }[];
  const howWeBuild = t.raw("howWeBuild.items") as { title: string; description: string }[];
  const journeySteps = t.raw("journey.steps") as string[];
  const flagshipFeatures = t.raw("flagship.features") as string[];
  const trustItems = t.raw("trust.items") as string[];

  return (
    <>
      <Hero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        primaryCta={t("hero.primaryCta")}
        secondaryCta={t("hero.secondaryCta")}
        visualAlt={t("hero.visualAlt")}
      />

      {/* Value proposition — light surface */}
      <section className="bg-surface-light py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-bold text-text-on-light">
              {t("valueProps.title")}
            </h2>
          </Reveal>
          <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {valueProps.map((item) => (
              <StaggerItem
                key={item.title}
                className="rounded-lg border border-border-light p-6 transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-text-on-light">{item.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{item.description}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Product catalogue preview — muted surface */}
      <section className="bg-surface-muted py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-text-on-light">{t("cataloguePreview.title")}</h2>
            <p className="mt-2 text-text-muted">{t("cataloguePreview.subtitle")}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10 rounded-xl border border-border-light bg-white p-8 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {t("flagship.eyebrow")}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-text-on-light">Eutech Clinic</h3>
              <Link
                href="/products/eutech-clinic"
                className="mt-5 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {t("cataloguePreview.cta")}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-sm italic text-text-muted">{t("cataloguePreview.moreComing")}</p>
          </Reveal>
        </div>
      </section>

      {/* How Eutech builds — dark surface for rhythm */}
      <section className="bg-surface-dark py-20 text-text-on-dark">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-bold">{t("howWeBuild.title")}</h2>
          </Reveal>
          <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {howWeBuild.map((item) => (
              <StaggerItem key={item.title} className="rounded-lg border border-white/10 p-6">
                <h3 className="font-semibold text-brand-400">{item.title}</h3>
                <p className="mt-2 text-sm text-text-on-dark/70">{item.description}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Customer journey — light surface */}
      <section className="bg-surface-light py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-text-on-light">
              {t("journey.title")}
            </h2>
          </Reveal>
          <StaggerGroup className="mt-10 space-y-4">
            {journeySteps.map((step, index) => (
              <StaggerItem key={step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="pt-1 text-text-on-light/80">{step}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Flagship product spotlight — muted surface */}
      <section className="bg-surface-muted py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal className="rounded-2xl border border-border-light bg-white p-10 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {t("flagship.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-text-on-light">{t("flagship.title")}</h2>
            <p className="mt-4 max-w-2xl text-text-muted">{t("flagship.description")}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {flagshipFeatures.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-text-on-light/80">
                  <span aria-hidden className="text-brand-600">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/products/eutech-clinic"
              className="mt-8 inline-block rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {t("flagship.cta")}
            </Link>
            <p className="mt-6 text-xs italic text-text-muted">{t("flagship.pilotNotice")}</p>
          </Reveal>
        </div>
      </section>

      {/* Trust/support — light surface */}
      <section className="bg-surface-light py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-text-on-light">{t("trust.title")}</h2>
          </Reveal>
          <StaggerGroup className="mt-8 space-y-4">
            {trustItems.map((item) => (
              <StaggerItem key={item} className="flex gap-3 text-text-on-light/80">
                <span aria-hidden className="text-brand-600">
                  ✓
                </span>
                <span>{item}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Final CTA — dark surface */}
      <section className="bg-surface-dark py-20 text-text-on-dark">
        <Reveal className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">{t("finalCta.title")}</h2>
          <p className="mt-4 text-lg text-text-on-dark/80">{t("finalCta.subtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              {t("finalCta.primaryCta")}
            </Link>
            <Link
              href="/products/eutech-clinic"
              className="rounded-md border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t("finalCta.secondaryCta")}
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
