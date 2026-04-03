import UserJobsPanel from "@/components/user-jobs-panel";
import UserProfileCompletionBanner from "@/components/user-profile-completion-banner";
import { getTranslations } from "next-intl/server";

export default async function UserJobsPage() {
  const t = await getTranslations("user.jobs");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("pageTitle")}</h2>
      <UserProfileCompletionBanner />
      <UserJobsPanel />
    </div>
  );
}
