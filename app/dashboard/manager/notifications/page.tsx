import ManagerNotificationsPanel from "@/components/manager-notifications-panel";
import ManagerInboxPanel from "@/components/manager-inbox-panel";
import NotificationChannelPreferences from "@/components/notification-channel-preferences";

export default async function ManagerNotificationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">Inbox</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Manager Notifications</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">
          Live alerts for queue changes, suspicious signals, and unusual moderation patterns.
        </p>
      </div>

      <NotificationChannelPreferences />

      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">In-app inbox</p>
          <ManagerInboxPanel />
        </div>
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Operations alerts</p>
          <ManagerNotificationsPanel />
        </div>
      </div>
    </div>
  );
}
