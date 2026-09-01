import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-light bg-surface-dark text-text-on-dark">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Eutech</p>
          <p className="mt-2 max-w-xs text-sm text-text-on-dark/70">{t("tagline")}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-brand-400">{t("product")}</p>
          <ul className="mt-3 space-y-2 text-sm text-text-on-dark/80">
            <li>
              <Link href="/products/eutech-clinic" className="hover:text-brand-400">
                {t("eutechClinic")}
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-brand-400">
                {t("allProducts")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-brand-400">{t("legal")}</p>
          <ul className="mt-3 space-y-2 text-sm text-text-on-dark/80">
            <li>
              <Link href="/terms" className="hover:text-brand-400">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-brand-400">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/subscription-terms" className="hover:text-brand-400">
                {t("subscriptionTerms")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-text-on-dark/50">
        {t("rights", { year })}
      </div>
    </footer>
  );
}
