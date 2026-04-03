import BusinessJobDetailPanel from "@/components/business-job-detail-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("jobDetailPageTitle")}</h2>
      <BusinessJobDetailPanel jobId={jobId} />
    </div>
  );
}
