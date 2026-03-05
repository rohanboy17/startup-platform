import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ClipboardCheck,
  Landmark,
  ScrollText,
  Megaphone,
} from "lucide-react";
import LogoutButton from "@/components/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

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

          <nav className="space-y-4 text-sm">
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <LayoutDashboard size={18} />
              Overview
            </Link>

            <Link
              href="/dashboard/admin/campaigns"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <Megaphone size={18} />
              Campaign Queue
            </Link>

            <Link
              href="/dashboard/admin/reviews"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <ClipboardCheck size={18} />
              Final Reviews
            </Link>

            <Link
              href="/dashboard/admin/users"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <Users size={18} />
              Users
            </Link>

            <Link
              href="/dashboard/admin/withdrawals"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <Wallet size={18} />
              Withdrawals
            </Link>

            <Link
              href="/dashboard/admin/revenue"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <Landmark size={18} />
              Revenue
            </Link>

            <Link
              href="/dashboard/admin/audit"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <ScrollText size={18} />
              Audit Logs
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
