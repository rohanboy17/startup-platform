import ManagerSettingsPanel from "@/components/manager-settings-panel";
import Link from "next/link";
import LanguageSettingsCard from "@/components/language-settings-card";

export default function ManagerSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/60">Manager settings</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Settings</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70 md:text-base">
          Configure moderation preferences and account security.
        </p>
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
        <p className="font-medium text-foreground">Account Security</p>
        <p className="mt-1">Forgot your password? Reset it securely.</p>
        <Link href="/forgot-password" className="mt-2 inline-block text-emerald-400 underline underline-offset-4">
          Forgot password
        </Link>
      </div>

      <LanguageSettingsCard />

      <ManagerSettingsPanel />
    </div>
  );
}
