export type ProductProfileFieldType = "string" | "int";

export type ProductProfileField = {
  key: string;
  label: string;
  type: ProductProfileFieldType;
  required: boolean;
  min?: number;
};

export type ProductProfileSchema = {
  requiresProfile: boolean;
  fields: ProductProfileField[];
};

// Per-product configuration for the post-purchase "business profile" step.
// A product with requiresProfile: false skips the profile gate in
// ProvisioningService.requestProvisioning entirely. Adding a new product
// here is the only step needed to give it its own onboarding form -- no
// new page/service/schema change required.
export const PRODUCT_PROFILE_SCHEMAS: Record<string, ProductProfileSchema> = {
  "eutech-clinic": {
    requiresProfile: true,
    fields: [
      { key: "registeredName", label: "Registered name", type: "string", required: false },
      { key: "addressLine1", label: "Address line 1", type: "string", required: false },
      { key: "addressLine2", label: "Address line 2", type: "string", required: false },
      { key: "city", label: "City", type: "string", required: false },
      { key: "country", label: "Country", type: "string", required: false },
      { key: "branchCount", label: "Branch count", type: "int", required: false, min: 1 },
      { key: "operatingHours", label: "Operating hours", type: "string", required: false },
      { key: "staffEstimate", label: "Staff estimate", type: "int", required: false, min: 1 },
    ],
  },
};

export function getProductProfileSchema(productSlug: string): ProductProfileSchema {
  return PRODUCT_PROFILE_SCHEMAS[productSlug] ?? { requiresProfile: false, fields: [] };
}

export function validateProductProfileData(
  productSlug: string,
  data: Record<string, unknown>,
): Record<string, string | number> {
  const schema = getProductProfileSchema(productSlug);
  const allowedKeys = new Set(schema.fields.map((field) => field.key));
  const result: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!allowedKeys.has(key) || value === undefined || value === null || value === "") {
      continue;
    }
    const field = schema.fields.find((f) => f.key === key)!;
    if (field.type === "int") {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(numeric) || (field.min !== undefined && numeric < field.min)) {
        throw new Error(`Invalid value for field "${key}".`);
      }
      result[key] = numeric;
    } else {
      result[key] = String(value);
    }
  }

  for (const field of schema.fields) {
    if (field.required && result[field.key] === undefined) {
      throw new Error(`Field "${field.key}" is required.`);
    }
  }

  return result;
}
