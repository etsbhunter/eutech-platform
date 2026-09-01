import { IsString } from "class-validator";

export class FakeCompleteCheckoutDto {
  @IsString()
  checkoutId!: string;

  @IsString()
  organizationId!: string;

  @IsString()
  productSlug!: string;

  @IsString()
  planSlug!: string;

  @IsString()
  interval!: "MONTHLY" | "ANNUAL";
}
