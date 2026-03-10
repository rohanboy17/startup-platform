import BusinessNotificationsPanel from "@/components/business-notifications-panel";

export default function BusinessNotificationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Business alerts</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Notifications</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Monitor campaign approval changes, budget problems, failed payments, and other business-side alerts.
        </p>
      </div>
      <BusinessNotificationsPanel />
    </div>
  );
}
