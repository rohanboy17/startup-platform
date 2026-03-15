import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale, getTranslations } from "next-intl/server";

export default async function FaqPage() {
  const locale = await getLocale();
  const t = await getTranslations("faq");

  const content = locale === "en" ? await getCmsValue<{ body: string }>("legal.faq", { body: "" }) : { body: "" };
  const body = content.body?.trim();
  const fallbackItems = (t.raw("items") as Array<{ q: string; a: string }>) || [];

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        {body ? (
          <PolicySection title={t("sectionTitle")}>
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          fallbackItems.map((item) => (
            <PolicySection key={item.q} title={item.q}>
              <p>{item.a}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}
