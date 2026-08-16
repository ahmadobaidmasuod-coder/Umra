export const DEFAULT_LOCALE = "ar" as const;
export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export const localeDirection = (locale: (typeof SUPPORTED_LOCALES)[number]) => locale === "ar" ? "rtl" : "ltr";
