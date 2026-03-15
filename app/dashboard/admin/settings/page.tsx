import AdminSystemSettingsPanel from "@/components/admin-system-settings-panel";
import LanguageSettingsCard from "@/components/language-settings-card";
import { getAppSettings, getRequiredEnvChecks } from "@/lib/system-settings";
import Link from "next/link";

export default async function AdminSettingsPage() {
  const [settings, envChecks] = await Promise.all([getAppSettings(), Promise.resolve(getRequiredEnvChecks())]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">System Settings</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p className="font-medium text-white">Account Security</p>
        <p className="mt-1">Need to rotate your password? Use secure reset.</p>
        <Link
          href="/forgot-password"
          className="mt-2 inline-block text-emerald-300 underline underline-offset-4"
        >
          Forgot password
        </Link>
      </div>
      <LanguageSettingsCard />
      <AdminSystemSettingsPanel initial={settings} envChecks={envChecks} />
    </div>
  );
}
