import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import PresenceHeartbeat from "@/components/presence-heartbeat";
import { getAppSettings } from "@/lib/system-settings";
import {
  canManageBusinessBilling,
  canManageBusinessCampaigns,
  canManageBusinessSettings,
  getBusinessContext,
} from "@/lib/business-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const displayName = session?.user?.name?.trim() || session?.user?.email || "User";

  if (!session || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "BUSINESS") {
    redirect("/dashboard");
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();
  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  const items = [
      { key: "business.overview", href: "/dashboard/business", label: "Overview", labelKey: "overview", icon: "overview" as const },
      { key: "business.campaigns", href: "/dashboard/business/campaigns", label: "Campaigns", labelKey: "campaigns", icon: "campaigns" as const },
      { key: "business.jobs", href: "/dashboard/business/jobs", label: "Jobs", labelKey: "jobs", icon: "jobs" as const },
      { key: "business.reviews", href: "/dashboard/business/reviews", label: "Reviews", labelKey: "reviews", icon: "reviews" as const },
      { key: "business.kyc", href: "/dashboard/business/kyc", label: "KYC", labelKey: "kyc", icon: "trust" as const },
    ...(canManageBusinessCampaigns(context.accessRole)
      ? [
          { key: "business.create", href: "/dashboard/business/create", label: "Create Campaign", labelKey: "createCampaign", icon: "create" as const },
          { key: "business.createJob", href: "/dashboard/business/jobs/create", label: "Create Job", labelKey: "createJob", icon: "create" as const },
        ]
      : []),
    { key: "business.analytics", href: "/dashboard/business/analytics", label: "Analytics", labelKey: "analytics", icon: "analytics" as const },
    ...(canManageBusinessBilling(context.accessRole)
      ? [{ key: "business.funding", href: "/dashboard/business/funding", label: "Funding", labelKey: "funding", icon: "funding" as const }]
      : []),
    { key: "business.notifications", href: "/dashboard/business/notifications", label: "Notifications", labelKey: "notifications", icon: "notifications" as const },
    { key: "business.trust", href: "/dashboard/business/trust", label: "Trust", labelKey: "trust", icon: "trust" as const },
    { key: "business.activity", href: "/dashboard/business/activity", label: "Activity", labelKey: "activity", icon: "audit" as const },
    ...(canManageBusinessSettings(context.accessRole)
      ? [
          { key: "business.team", href: "/dashboard/business/team", label: "Team", labelKey: "team", icon: "users" as const },
          { key: "business.settings", href: "/dashboard/business/settings", label: "Settings", labelKey: "settings", icon: "cms" as const },
        ]
      : []),
  ];

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_28%)] bg-background text-foreground">
      <PresenceHeartbeat />
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-xl sm:p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
          <DashboardTabNav
            displayName={displayName}
            role="BUSINESS"
            userId={session.user.id}
            items={items}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
