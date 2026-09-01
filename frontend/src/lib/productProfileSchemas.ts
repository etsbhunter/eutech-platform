// Mirrors the backend's per-product profile field configuration
// (backend/src/catalogue/product-profile-schema.ts). Adding a new product's
// onboarding form is one entry here plus one i18n block -- no new page.
export type ProductProfileField = {
  key: string;
  labelKey: string;
  type: "text" | "number";
  min?: number;
};

export type ProductProfileSchema = {
  requiresProfile: boolean;
  fields: ProductProfileField[];
};

export const PRODUCT_PROFILE_SCHEMAS: Record<string, ProductProfileSchema> = {
  "eutech-clinic": {
    requiresProfile: true,
    fields: [
      { key: "registeredName", labelKey: "registeredName", type: "text" },
      { key: "addressLine1", labelKey: "addressLine1", type: "text" },
      { key: "addressLine2", labelKey: "addressLine2", type: "text" },
      { key: "city", labelKey: "city", type: "text" },
      { key: "country", labelKey: "country", type: "text" },
      { key: "branchCount", labelKey: "branchCount", type: "number", min: 1 },
      { key: "operatingHours", labelKey: "operatingHours", type: "text" },
      { key: "staffEstimate", labelKey: "staffEstimate", type: "number", min: 1 },
    ],
  },
};

export function getProductProfileSchema(productSlug: string): ProductProfileSchema {
  return PRODUCT_PROFILE_SCHEMAS[productSlug] ?? { requiresProfile: false, fields: [] };
}
