"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  en: "English",
  zh: "简体中文",
};

export function LanguageSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-brand-900">
      <span className="sr-only">{t("languageLabel")}</span>
      <select
        aria-label={t("languageLabel")}
        value={locale}
        onChange={(event) => {
          router.replace(pathname, { locale: event.target.value });
        }}
        className="rounded-md border border-brand-200 bg-white px-2 py-1 text-sm text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {localeLabels[code] ?? code}
          </option>
        ))}
      </select>
    </label>
  );
}
