import BusinessCampaignsPanel from "@/components/business-campaigns-panel";
import { getTranslations } from "next-intl/server";

export default async function CampaignsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("campaignsPageTitle")}</h2>
      <BusinessCampaignsPanel />
    </div>
  );
}
