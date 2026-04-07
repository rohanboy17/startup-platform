import ManagerHistoryPanel from "@/components/manager-history-panel";
import { getTranslations } from "next-intl/server";

export default async function ManagerHistoryPage() {
  const t = await getTranslations("manager.historyPage");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">
          {t("subtitle")}
        </p>
      </div>
      <ManagerHistoryPanel />
    </div>
  );
}
