import { IsObject } from "class-validator";

export class UpsertProductProfileDto {
  @IsObject()
  data!: Record<string, string | number>;
}
