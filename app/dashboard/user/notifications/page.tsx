import UserNotificationsPanel from "@/components/user-notifications-panel";

export default async function UserNotificationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">Inbox</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Notifications</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
          Review approvals, rejections, payout updates, and system notices in one live feed.
        </p>
      </div>
      <UserNotificationsPanel />
    </div>
  );
}
