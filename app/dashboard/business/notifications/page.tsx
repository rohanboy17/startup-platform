import BusinessNotificationsPanel from "@/components/business-notifications-panel";
import { getTranslations } from "next-intl/server";

export default async function BusinessNotificationsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">Business alerts</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("notificationsPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">
          Monitor campaign approval changes, job moderation updates, budget problems, and other business-side alerts.
        </p>
      </div>
      <BusinessNotificationsPanel />
    </div>
  );
}
