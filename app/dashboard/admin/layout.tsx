import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import DashboardTabNav, { HomeNavLink } from "@/components/dashboard-tab-nav";

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
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="flex">
        <aside className="w-72 space-y-8 border-r border-white/10 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Signed in as</p>
            <p className="text-sm font-medium text-white/90">{displayName}</p>
          </div>

          <DashboardTabNav
            role="ADMIN"
            userId={session.user.id}
            items={[
              { key: "admin.overview", href: "/dashboard/admin", label: "Overview", icon: "overview" },
              { key: "admin.campaigns", href: "/dashboard/admin/campaigns", label: "Campaign Queue", icon: "campaigns" },
              { key: "admin.reviews", href: "/dashboard/admin/reviews", label: "Final Reviews", icon: "reviews" },
              { key: "admin.users", href: "/dashboard/admin/users", label: "Users", icon: "users" },
              { key: "admin.withdrawals", href: "/dashboard/admin/withdrawals", label: "Withdrawals", icon: "wallet" },
              { key: "admin.revenue", href: "/dashboard/admin/revenue", label: "Revenue", icon: "revenue" },
              { key: "admin.audit", href: "/dashboard/admin/audit", label: "Audit Logs", icon: "audit" },
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
