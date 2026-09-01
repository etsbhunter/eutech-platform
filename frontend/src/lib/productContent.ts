// Maps a product's slug to its i18n namespace under ProductDetail.*. Adding a
// product's marketing page is one new namespace block in messages/*.json plus
// one entry here -- no new page file (see src/app/[locale]/products/[slug]/page.tsx).
export const PRODUCT_CONTENT_NAMESPACE: Record<string, string> = {
  "eutech-clinic": "eutechClinic",
};

export function getProductContentNamespace(productSlug: string): string | null {
  return PRODUCT_CONTENT_NAMESPACE[productSlug] ?? null;
}
