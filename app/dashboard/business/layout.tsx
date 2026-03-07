import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import PresenceHeartbeat from "@/components/presence-heartbeat";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <PresenceHeartbeat />
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-white/10 p-6 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r">
          <DashboardTabNav
            displayName={displayName}
            role="BUSINESS"
            userId={session.user.id}
            items={[
              { key: "business.overview", href: "/dashboard/business", label: "Overview", icon: "overview" },
              { key: "business.campaigns", href: "/dashboard/business/campaigns", label: "Campaigns", icon: "campaigns" },
              { key: "business.create", href: "/dashboard/business/create", label: "Create Campaign", icon: "create" },
              { key: "business.analytics", href: "/dashboard/business/analytics", label: "Analytics", icon: "analytics" },
              { key: "business.funding", href: "/dashboard/business/funding", label: "Funding", icon: "funding" },
            ]}
          />
        </aside>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
