import { IsISO8601, IsString, Length } from "class-validator";

export class GrantEntitlementDto {
  @IsString()
  @Length(10, 500)
  reason!: string;

  // Required: manual entitlement overrides must always be time-limited.
  @IsISO8601()
  expiresAt!: string;
}
