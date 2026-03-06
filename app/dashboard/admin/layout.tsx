import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardTabNav from "@/components/dashboard-tab-nav";

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
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-white/10 p-6 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r">
          <DashboardTabNav
            title="Admin Panel"
            displayName={displayName}
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
        </aside>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
