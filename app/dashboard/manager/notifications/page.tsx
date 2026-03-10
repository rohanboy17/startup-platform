import ManagerNotificationsPanel from "@/components/manager-notifications-panel";

export default async function ManagerNotificationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Inbox</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager Notifications</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          Live alerts for queue changes, suspicious signals, and unusual moderation patterns.
        </p>
      </div>
      <ManagerNotificationsPanel />
    </div>
  );
}

