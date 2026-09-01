import { IsOptional, IsString, Length } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  country?: string;
}
