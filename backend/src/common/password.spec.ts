import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("Str0ng!Passw0rd");
    await expect(verifyPassword("Str0ng!Passw0rd", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Str0ng!Passw0rd");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time due to random salt", async () => {
    const hashA = await hashPassword("Str0ng!Passw0rd");
    const hashB = await hashPassword("Str0ng!Passw0rd");
    expect(hashA).not.toBe(hashB);
  });
});
