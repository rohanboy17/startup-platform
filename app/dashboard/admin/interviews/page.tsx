import { getTranslations } from "next-intl/server";
import AdminInterviewsPanel from "@/components/admin-interviews-panel";
import AdminJobChatFlagsPanel from "@/components/admin-job-chat-flags-panel";

export default async function AdminInterviewsPage() {
  const navT = await getTranslations("dashboard.nav");
  const t = await getTranslations("admin.interviewsPage");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{navT("interviews")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">{t("pageDescription")}</p>
      </div>

      <AdminInterviewsPanel />
      <AdminJobChatFlagsPanel />
    </div>
  );
}
