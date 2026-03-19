import UserNotificationsPanel from "@/components/user-notifications-panel";
import { getTranslations } from "next-intl/server";

export default async function UserNotificationsPage() {
  const t = await getTranslations("user.notificationsPage");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          {t("subtitle")}
        </p>
      </div>
      <UserNotificationsPanel />
    </div>
  );
}
