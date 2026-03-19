import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getTranslations } from "next-intl/server";
import PublicSocialLinks from "@/components/public-social-links";
import PublicChannelLinks from "@/components/public-channel-links";
import { SUPPORT_ADDRESS, SUPPORT_EMAIL } from "@/lib/public-links";

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PolicySection title={t("supportEmailTitle")}>
          <p>{t("supportEmailLead")}</p>
          <p className="text-base font-semibold text-white">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>{t("supportResponse")}</p>
        </PolicySection>

        <PolicySection title={t("hoursTitle")}>
          <p>{t("hoursDays")}</p>
          <p className="font-medium text-white">{t("hoursTime")}</p>
          <p>{t("hoursNote")}</p>
        </PolicySection>
      </div>

      <div className="mt-4">
        <PolicySection title={t("addressTitle")}>
          <p>{SUPPORT_ADDRESS}</p>
        </PolicySection>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <PolicySection title={t("communityTitle")}>
          <p>{t("communityLead")}</p>
          <div className="mt-4">
            <PublicChannelLinks
              whatsappLabel={t("whatsappLabel")}
              telegramLabel={t("telegramLabel")}
            />
          </div>
        </PolicySection>

        <PolicySection title={t("socialTitle")}>
          <p>{t("socialLead")}</p>
          <PublicSocialLinks className="mt-4" />
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}

