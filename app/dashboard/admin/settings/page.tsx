import AdminSystemSettingsPanel from "@/components/admin-system-settings-panel";
import { getAppSettings, getRequiredEnvChecks } from "@/lib/system-settings";

export default async function AdminSettingsPage() {
  const [settings, envChecks] = await Promise.all([getAppSettings(), Promise.resolve(getRequiredEnvChecks())]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">System Settings</h2>
      <AdminSystemSettingsPanel initial={settings} envChecks={envChecks} />
    </div>
  );
}
