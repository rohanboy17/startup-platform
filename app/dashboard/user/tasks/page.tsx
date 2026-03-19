import UserCampaignsPanel from "@/components/user-campaigns-panel";
import UserProfileCompletionBanner from "@/components/user-profile-completion-banner";
import { getTranslations } from "next-intl/server";

export default async function TasksPage() {
  const t = await getTranslations("user.tasks");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("title")}</h2>
      <UserProfileCompletionBanner />
      <UserCampaignsPanel />
    </div>
  );
}
