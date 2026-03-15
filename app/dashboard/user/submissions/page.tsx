import UserV2SubmissionsPanel from "@/components/user-v2-submissions-panel";
import { getTranslations } from "next-intl/server";

export default async function UserSubmissionsPage() {
  const t = await getTranslations("user.submissions");
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">{t("title")}</h2>
      <UserV2SubmissionsPanel />
    </div>
  );
}
