import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import PresenceHeartbeat from "@/components/presence-heartbeat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const displayName = session?.user?.name?.trim() || session?.user?.email || "User";

  if (!session || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_28%)] bg-background text-foreground">
      <PresenceHeartbeat />
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-xl sm:p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
          <DashboardTabNav
            displayName={displayName}
            role="ADMIN"
            userId={session.user.id}
            items={[
              { key: "admin.overview", href: "/dashboard/admin", label: "Overview", labelKey: "overview", icon: "overview" },
              { key: "admin.risk", href: "/dashboard/admin/risk", label: "Risk Center", labelKey: "riskCenter", icon: "risk" },
              { key: "admin.campaigns", href: "/dashboard/admin/campaigns", label: "Campaign Management", labelKey: "campaignManagement", icon: "campaigns" },
              { key: "admin.jobs", href: "/dashboard/admin/jobs", label: "Jobs", labelKey: "jobs", icon: "jobs" },
              { key: "admin.reviews", href: "/dashboard/admin/reviews", label: "Final Reviews", labelKey: "finalReviews", icon: "reviews" },
              { key: "admin.users", href: "/dashboard/admin/users", label: "Users", labelKey: "users", icon: "users" },
              { key: "admin.businesses", href: "/dashboard/admin/businesses", label: "Businesses", labelKey: "businesses", icon: "users" },
              { key: "admin.funding", href: "/dashboard/admin/funding", label: "Funding", labelKey: "funding", icon: "funding" },
              { key: "admin.withdrawals", href: "/dashboard/admin/withdrawals", label: "Withdrawals", labelKey: "withdrawals", icon: "wallet" },
              { key: "admin.revenue", href: "/dashboard/admin/revenue", label: "Revenue", labelKey: "revenue", icon: "revenue" },
              { key: "admin.referrals", href: "/dashboard/admin/referrals", label: "Referrals", labelKey: "referrals", icon: "referrals" },
              { key: "admin.notifications", href: "/dashboard/admin/notifications", label: "Notifications", labelKey: "notifications", icon: "notifications" },
              { key: "admin.settings", href: "/dashboard/admin/settings", label: "System Settings", labelKey: "systemSettings", icon: "cms" },
              { key: "admin.compliance", href: "/dashboard/admin/compliance", label: "Compliance", labelKey: "compliance", icon: "audit" },
              { key: "admin.cms", href: "/dashboard/admin/cms", label: "Content & CMS", labelKey: "cms", icon: "cms" },
              { key: "admin.audit", href: "/dashboard/admin/audit", label: "Audit Logs", labelKey: "auditLogs", icon: "audit" },
            ]}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
