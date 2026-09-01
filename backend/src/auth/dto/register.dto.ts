import { IsEmail, IsString, Length } from "class-validator";
import { IsStrongPassword } from "../../common/strong-password.validator";

export class RegisterDto {
  @IsString()
  @Length(1, 200)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;
}
