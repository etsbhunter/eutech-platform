import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { ProductPlans } from "@/components/products/ProductPlans";
import { fetchProducts } from "@/lib/catalogueApi";
import { getProductContentNamespace } from "@/lib/productContent";

export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const namespace = getProductContentNamespace(slug);
  if (!namespace) {
    notFound();
  }

  const products = await fetchProducts().catch(() => []);
  if (!products.some((product) => product.slug === slug)) {
    notFound();
  }

  return <ProductDetailContent slug={slug} namespace={namespace} />;
}

function ProductDetailContent({ slug, namespace }: { slug: string; namespace: string }) {
  const t = useTranslations(`ProductDetail.${namespace}`);
  const tDemo = useTranslations("Header");
  const sections = t.raw("sections") as { title: string; description: string }[];

  return (
    <>
      <section className="bg-surface-light py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <h1 className="text-4xl font-bold text-text-on-light">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-lg text-text-muted">{t("subtitle")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#plans"
                className="inline-block rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                {t("subscribeCta")}
              </a>
              <Link
                href={`/demo?product=${encodeURIComponent(slug)}`}
                className="inline-block rounded-md border border-border-light px-6 py-3 text-sm font-semibold text-text-on-light transition-colors hover:bg-brand-50"
              >
                {tDemo("bookDemo")}
              </Link>
            </div>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-2">
            {sections.map((section) => (
              <StaggerItem
                key={section.title}
                className="rounded-lg border border-border-light p-6 transition-shadow hover:shadow-md"
              >
                <h2 className="font-semibold text-text-on-light">{section.title}</h2>
                <p className="mt-2 text-sm text-text-muted">{section.description}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <div id="plans">
        <ProductPlans productSlug={slug} />
      </div>
    </>
  );
}
