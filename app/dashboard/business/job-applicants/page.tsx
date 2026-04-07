import BusinessJobApplicationsPanel from "@/components/business-job-applications-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessJobApplicantsPage() {
  const t = await getTranslations("business");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-sky-600/80 dark:text-sky-300/70">
          {t("jobApplicantsPageEyebrow")}
        </p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("jobApplicantsPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">
          {t("jobApplicantsPageSubtitle")}
        </p>
      </div>
      <BusinessJobApplicationsPanel />
    </div>
  );
}
