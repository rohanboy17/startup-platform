import { redirect } from "next/navigation";
import UserEarnAdsPanel from "@/components/user-earn-ads-panel";
import { getAppSettings } from "@/lib/system-settings";

export default async function UserEarnAdsPage() {
  const settings = await getAppSettings();

  if (!settings.bonusAdsEnabled) {
    redirect("/dashboard/user");
  }

  return <UserEarnAdsPanel />;
}
