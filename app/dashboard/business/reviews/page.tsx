import BusinessSubmissionsPanel from "@/components/business-submissions-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessReviewsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Submission review</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("reviewsPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Monitor the moderation pipeline for your campaigns, see rejection reasons, and export the queue.
        </p>
      </div>
      <BusinessSubmissionsPanel />
    </div>
  );
}
