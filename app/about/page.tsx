import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getTranslations } from "next-intl/server";

export default async function AboutPage() {
  const t = await getTranslations("about");
  const bullets = (t.raw("sections.trust.bullets") as string[]) || [];

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-4">
        <PolicySection title={t("sections.build.title")}>
          <p>{t("sections.build.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.trust.title")}>
          <ul className="list-disc space-y-1 pl-5">
            {bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </PolicySection>

        <PolicySection title={t("sections.direction.title")}>
          <p>{t("sections.direction.body")}</p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}
