import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardTabNav from "@/components/dashboard-tab-nav";

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
          <DashboardTabNav
            displayName={displayName}
            role="MANAGER"
            userId={session.user.id}
            items={[
              { key: "manager.overview", href: "/dashboard/manager", label: "Overview", icon: "overview" },
              { key: "manager.submissions", href: "/dashboard/manager/submissions", label: "Submission Queue", icon: "submissions" },
            ]}
          />
        </aside>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
