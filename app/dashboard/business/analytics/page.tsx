import BusinessAnalyticsPanel from "@/components/business-analytics-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessAnalyticsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold md:text-3xl">{t("analyticsPageTitle")}</h2>
      <BusinessAnalyticsPanel />
    </div>
  );
}
