export type SupportedLocale = "en" | "hi" | "bn";

// Map app locales to a date locale that matches our target audience (India).
export function toDateLocale(locale: string): string {
  if (locale === "hi") return "hi-IN";
  if (locale === "bn") return "bn-IN";
  return "en-IN";
}

