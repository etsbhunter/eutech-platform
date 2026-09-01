import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { fetchProducts } from "@/lib/catalogueApi";
import { getProductContentNamespace } from "@/lib/productContent";

export default async function ProductsPage({
  params,
}: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const products = await fetchProducts().catch(() => []);
  return <ProductsContent products={products} />;
}

function ProductsContent({ products }: { products: { slug: string; name: string }[] }) {
  const t = useTranslations("Products");

  const cards = products
    .map((product) => {
      const namespace = getProductContentNamespace(product.slug);
      if (!namespace) return null;
      return {
        slug: product.slug,
        category: t(`${namespace}.category`),
        name: t(`${namespace}.name`),
        summary: t(`${namespace}.summary`),
        availability: t(`${namespace}.availability`),
        cta: t(`${namespace}.cta`),
        href: `/products/${product.slug}`,
      };
    })
    .filter((card): card is NonNullable<typeof card> => card !== null);

  return (
    <section className="bg-surface-light py-20">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <h1 className="text-4xl font-bold text-text-on-light">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-text-muted">{t("subtitle")}</p>
        </Reveal>

        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2">
          {cards.map((product) => (
            <StaggerItem
              key={product.slug}
              className="flex flex-col rounded-xl border border-border-light bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {product.category}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-on-light">{product.name}</h2>
              <p className="mt-3 flex-1 text-text-muted">{product.summary}</p>
              <p className="mt-4 text-xs font-medium text-brand-600">{product.availability}</p>
              <Link
                href={product.href}
                className="mt-6 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {product.cta}
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal delay={0.1}>
          <p className="mt-10 text-sm italic text-text-muted">{t("moreComingDescription")}</p>
        </Reveal>
      </div>
    </section>
  );
}
