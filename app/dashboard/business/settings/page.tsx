import BusinessSettingsPanel from "@/components/business-settings-panel";
import LanguageSettingsCard from "@/components/language-settings-card";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function BusinessSettingsPage() {
  const t = await getTranslations("business");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">Business settings</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("settingsPageTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">
          Manage business identity, billing notes, refund preferences, and alert preferences.
        </p>
      </div>
      <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4 text-sm text-foreground/70">
        <p className="font-medium text-foreground">Account Security</p>
        <p className="mt-1">Forgot your password? Reset it securely.</p>
        <Link
          href="/forgot-password"
          className="mt-2 inline-block text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
        >
          Forgot password
        </Link>
      </div>
      <LanguageSettingsCard />
      <BusinessSettingsPanel />
    </div>
  );
}
