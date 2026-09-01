import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Min,
} from "class-validator";
import { PreferredContactMethod } from "@prisma/client";

export class CreateDemoRequestDto {
  @IsString()
  @Length(1, 200)
  fullName!: string;

  @IsEmail()
  businessEmail!: string;

  @IsPhoneNumber(undefined)
  phone!: string;

  @IsString()
  @Length(1, 200)
  companyName!: string;

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  branchCount?: number;

  @IsEnum(PreferredContactMethod)
  preferredContactMethod!: PreferredContactMethod;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  message?: string;

  @IsBoolean()
  consent!: boolean;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  // Honeypot field: real users never fill this in. Left populated by bots
  // filling every field. Not persisted; used only to silently drop spam.
  @IsOptional()
  @IsString()
  website?: string;
}
