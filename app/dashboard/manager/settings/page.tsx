import ManagerSettingsPanel from "@/components/manager-settings-panel";
import Link from "next/link";
import LanguageSettingsCard from "@/components/language-settings-card";
import { getTranslations } from "next-intl/server";

export default async function ManagerSettingsPage() {
  const t = await getTranslations("manager.settingsPage");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/60">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70 md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
        <p className="font-medium text-foreground">{t("securityTitle")}</p>
        <p className="mt-1">{t("securityBody")}</p>
        <Link href="/forgot-password" className="mt-2 inline-block text-emerald-400 underline underline-offset-4">
          {t("forgotPassword")}
        </Link>
      </div>

      <LanguageSettingsCard />

      <ManagerSettingsPanel />
    </div>
  );
}
