import UserJobApplicationsPanel from "@/components/user-job-applications-panel";
import { getTranslations } from "next-intl/server";

export default async function UserJobApplicationsPage() {
  const t = await getTranslations("user.jobApplications");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("pageTitle")}</h2>
      <UserJobApplicationsPanel />
    </div>
  );
}
