import BusinessSettingsPanel from "@/components/business-settings-panel";

export default function BusinessSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Business settings</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Settings</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Manage business identity, billing notes, refund preferences, and alert preferences.
        </p>
      </div>
      <BusinessSettingsPanel />
    </div>
  );
}
