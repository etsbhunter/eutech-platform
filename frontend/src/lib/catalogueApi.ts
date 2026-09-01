const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export type CataloguePrice = {
  interval: "MONTHLY" | "ANNUAL";
  amountMinorUnits: number;
  currency: string;
  isPlaceholder: boolean;
};

export type CataloguePlan = {
  slug: string;
  name: string;
  prices: CataloguePrice[];
  features: { slug: string; value: string | null }[];
};

export type CatalogueResponse = {
  product: { slug: string; name: string };
  plans: CataloguePlan[];
};

export async function fetchCatalogue(productSlug: string): Promise<CatalogueResponse> {
  const response = await fetch(
    `${API_BASE_URL}/catalogue/plans?product=${encodeURIComponent(productSlug)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load catalogue: ${response.status}`);
  }
  const body = (await response.json()) as { data: CatalogueResponse };
  return body.data;
}

export type CatalogueProduct = { slug: string; name: string };

export async function fetchProducts(): Promise<CatalogueProduct[]> {
  const response = await fetch(`${API_BASE_URL}/catalogue/products`);
  if (!response.ok) {
    throw new Error(`Failed to load products: ${response.status}`);
  }
  const body = (await response.json()) as { data: CatalogueProduct[] };
  return body.data;
}
