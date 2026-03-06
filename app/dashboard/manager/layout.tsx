import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import DashboardTabNav, { HomeNavLink } from "@/components/dashboard-tab-nav";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-b border-white/10 p-6 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r">
          <h1 className="text-2xl font-semibold tracking-tight">Manager Panel</h1>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Signed in as</p>
            <p className="text-sm font-medium text-white/90">{displayName}</p>
          </div>

          <DashboardTabNav
            role="MANAGER"
            userId={session.user.id}
            items={[
              { key: "manager.overview", href: "/dashboard/manager", label: "Overview", icon: "overview" },
              { key: "manager.submissions", href: "/dashboard/manager/submissions", label: "Submission Queue", icon: "submissions" },
            ]}
          />

          <div className="pt-4">
            <HomeNavLink />
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
