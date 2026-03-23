import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageTransition from "@/components/page-transition";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import PresenceHeartbeat from "@/components/presence-heartbeat";
import UserProfileCompletionPrompt from "@/components/user-profile-completion-prompt";
import { getAppSettings } from "@/lib/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <div className="dashboard-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_28%)] bg-background text-foreground">
      <PresenceHeartbeat />
      <UserProfileCompletionPrompt />
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-xl sm:p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
          <DashboardTabNav
            displayName={displayName}
            role="USER"
            userId={session.user.id}
            items={[
              { key: "user.overview", href: "/dashboard/user", label: "Overview", labelKey: "overview", icon: "overview" },
              { key: "user.tasks", href: "/dashboard/user/tasks", label: "Tasks", labelKey: "tasks", icon: "tasks" },
              { key: "user.submissions", href: "/dashboard/user/submissions", label: "Submissions", labelKey: "submissions", icon: "submissions" },
              { key: "user.wallet", href: "/dashboard/user/wallet", label: "Wallet", labelKey: "wallet", icon: "wallet" },
              { key: "user.withdrawals", href: "/dashboard/user/withdrawals", label: "Withdrawals", labelKey: "withdrawals", icon: "withdrawals" },
              { key: "user.earnAds", href: "/dashboard/user/earn-ads", label: "Watch Ads & Earn", labelKey: "earnAds", icon: "earnAds" },
              { key: "user.referrals", href: "/dashboard/user/referrals", label: "Referrals", labelKey: "referrals", icon: "referrals" },
              { key: "user.notifications", href: "/dashboard/user/notifications", label: "Notifications", labelKey: "notifications", icon: "notifications" },
              { key: "user.profile", href: "/dashboard/user/profile", label: "Profile", labelKey: "profile", icon: "profile" },
              { key: "user.settings", href: "/dashboard/user/settings", label: "Settings", labelKey: "settings", icon: "settings" },
              { key: "user.help", href: "/dashboard/user/help", label: "Help", labelKey: "help", icon: "help" },
            ]}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
