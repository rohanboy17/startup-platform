import BusinessSubmissionsPanel from "@/components/business-submissions-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessReviewsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Campaign responses</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("reviewsPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          See every response to your campaigns, follow its status, and understand why something was rejected.
        </p>
      </div>
      <BusinessSubmissionsPanel />
    </div>
  );
}
