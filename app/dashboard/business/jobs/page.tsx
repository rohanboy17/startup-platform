import BusinessJobsPanel from "@/components/business-jobs-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessJobsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("jobsPageTitle")}</h2>
      <BusinessJobsPanel />
    </div>
  );
}
