// Full-page navigation to an external or same-origin URL (e.g. a hosted
// checkout/billing-portal redirect). Kept outside any component/hook body
// so the React Compiler's static analysis doesn't flag it as a render-time
// mutation of an external variable.
export function hardNavigate(url: string): void {
  window.location.href = url;
}
