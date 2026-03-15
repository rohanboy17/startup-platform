import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value || "";
  const inferred = (await requestLocale) || "";
  const candidate = cookieLocale || inferred || "en";
  const locale = candidate === "hi" || candidate === "bn" || candidate === "en" ? candidate : "en";

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    messages = (await import("../messages/en.json")).default;
  }

  return {
    locale,
    messages,
  };
});
