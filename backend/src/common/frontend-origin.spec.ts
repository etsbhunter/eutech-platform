import { getPrimaryFrontendOrigin } from "./frontend-origin";

describe("getPrimaryFrontendOrigin", () => {
  const original = process.env.FRONTEND_ORIGIN;

  afterEach(() => {
    if (original === undefined) delete process.env.FRONTEND_ORIGIN;
    else process.env.FRONTEND_ORIGIN = original;
  });

  it("defaults to localhost:3000 when unset", () => {
    delete process.env.FRONTEND_ORIGIN;
    expect(getPrimaryFrontendOrigin()).toBe("http://localhost:3000");
  });

  it("returns the single origin unchanged", () => {
    process.env.FRONTEND_ORIGIN = "https://eutech-platform.test";
    expect(getPrimaryFrontendOrigin()).toBe("https://eutech-platform.test");
  });

  it("returns only the first origin from a comma-separated CORS list", () => {
    process.env.FRONTEND_ORIGIN =
      "http://localhost:3000,http://eutech-platform.test,https://eutech-platform.test";
    expect(getPrimaryFrontendOrigin()).toBe("http://localhost:3000");
  });
});
