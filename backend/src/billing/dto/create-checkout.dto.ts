import { IsIn, IsString } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  organizationId!: string;

  @IsString()
  productSlug!: string;

  @IsString()
  planSlug!: string;

  @IsIn(["MONTHLY", "ANNUAL"])
  interval!: "MONTHLY" | "ANNUAL";
}
