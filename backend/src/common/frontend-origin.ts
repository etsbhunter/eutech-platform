// FRONTEND_ORIGIN may hold a comma-separated list (see main.ts's CORS setup,
// which allows multiple origins for local .test-domain development). Any
// code building a URL to redirect a browser to (not just checking a request's
// Origin header) needs exactly one origin, so it must always go through this
// helper rather than reading the env var directly.
export function getPrimaryFrontendOrigin(): string {
  const raw = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  const first = raw.split(",")[0]?.trim();
  return first || "http://localhost:3000";
}
