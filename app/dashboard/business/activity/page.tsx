import BusinessActivityLogPanel from "@/components/business-activity-log-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessActivityPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Business timeline</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("activityPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Review who changed what across campaigns, moderation events, funding, and wallet activity.
        </p>
      </div>
      <BusinessActivityLogPanel />
    </div>
  );
}
