import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageTransition from "@/components/page-transition";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import PresenceHeartbeat from "@/components/presence-heartbeat";
import { getAppSettings } from "@/lib/system-settings";

export default async function UserLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const displayName = session?.user?.name?.trim() || session?.user?.email || "User";

  if (!session || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "USER") {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();
  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <PresenceHeartbeat />
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-white/10 p-6 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r">
          <DashboardTabNav
            displayName={displayName}
            role="USER"
            userId={session.user.id}
            showForgotPasswordInNav
            items={[
              { key: "user.overview", href: "/dashboard/user", label: "Overview", icon: "overview" },
              { key: "user.tasks", href: "/dashboard/user/tasks", label: "Tasks", icon: "tasks" },
              { key: "user.submissions", href: "/dashboard/user/submissions", label: "Submissions", icon: "submissions" },
              { key: "user.wallet", href: "/dashboard/user/wallet", label: "Wallet", icon: "wallet" },
              { key: "user.withdrawals", href: "/dashboard/user/withdrawals", label: "Withdrawals", icon: "withdrawals" },
              { key: "user.referrals", href: "/dashboard/user/referrals", label: "Referrals", icon: "referrals" },
              { key: "user.notifications", href: "/dashboard/user/notifications", label: "Notifications", icon: "notifications" },
              { key: "user.help", href: "/dashboard/user/help", label: "Help", icon: "help" },
            ]}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
