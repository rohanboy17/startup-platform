import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ClipboardCheck } from "lucide-react";
import LogoutButton from "@/components/logout-button";

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-r border-white/10 p-6 backdrop-blur-xl md:w-72">
          <h1 className="text-2xl font-semibold tracking-tight">Manager Panel</h1>

          <nav className="space-y-4 text-sm">
            <Link
              href="/dashboard/manager"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <LayoutDashboard size={18} />
              Overview
            </Link>

            <Link
              href="/dashboard/manager/submissions"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <ClipboardCheck size={18} />
              Submission Queue
            </Link>
          </nav>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
