import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import DashboardTabNav, { HomeNavLink } from "@/components/dashboard-tab-nav";

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
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-r border-white/10 p-6 backdrop-blur-xl md:w-72">
          <h1 className="text-2xl font-semibold tracking-tight">Campaign Manager</h1>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Signed in as</p>
            <p className="text-sm font-medium text-white/90">{displayName}</p>
          </div>

          <DashboardTabNav
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

          <div className="pt-4">
            <HomeNavLink />
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
