import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import PresenceHeartbeat from "@/components/presence-heartbeat";
import { getAppSettings } from "@/lib/system-settings";

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const displayName = session?.user?.name?.trim() || session?.user?.email || "User";

  if (!session || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();
  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  return (
    <div className="dashboard-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_28%)] bg-background text-foreground">
      <PresenceHeartbeat />
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r">
          <DashboardTabNav
            displayName={displayName}
            role="MANAGER"
            userId={session.user.id}
            showForgotPasswordInNav
            items={[
              { key: "manager.overview", href: "/dashboard/manager", label: "Overview", icon: "overview" },
              { key: "manager.submissions", href: "/dashboard/manager/submissions", label: "Submission Queue", icon: "submissions" },
              { key: "manager.notifications", href: "/dashboard/manager/notifications", label: "Notifications", icon: "notifications" },
              { key: "manager.history", href: "/dashboard/manager/history", label: "History", icon: "audit" },
              { key: "manager.risk", href: "/dashboard/manager/risk", label: "Risk", icon: "risk" },
            ]}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
