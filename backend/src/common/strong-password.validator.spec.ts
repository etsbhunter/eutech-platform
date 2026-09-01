import { validate } from "class-validator";
import { IsStrongPassword } from "./strong-password.validator";

class Dummy {
  @IsStrongPassword()
  password!: string;
}

async function isValidPassword(password: string): Promise<boolean> {
  const dummy = new Dummy();
  dummy.password = password;
  const errors = await validate(dummy);
  return errors.length === 0;
}

describe("IsStrongPassword", () => {
  it.each(["Str0ng!Pass", "Aa1!aaaa"])("accepts %s", async (password) => {
    await expect(isValidPassword(password)).resolves.toBe(true);
  });

  it.each([
    "alllowercase1!",
    "ALLUPPERCASE1!",
    "NoNumber!Aa",
    "NoSymbol1Aa",
    "Aa1!aaa",
  ])("rejects %s", async (password) => {
    await expect(isValidPassword(password)).resolves.toBe(false);
  });
});
