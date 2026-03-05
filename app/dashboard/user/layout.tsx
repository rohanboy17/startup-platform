import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ListChecks,
  Wallet,
  ArrowUpCircle,
  ClipboardCheck,
  Bell,
} from "lucide-react";
import PageTransition from "@/components/page-transition";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/logout-button";

export default async function UserLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "USER") {
    redirect("/dashboard");
  }

  const notificationDelegate = (prisma as unknown as {
    notification?: {
      count: (args: { where: { userId: string; isRead: boolean } }) => Promise<number>;
    };
  }).notification;

  const unreadCount = notificationDelegate
    ? await notificationDelegate.count({
        where: { userId: session.user.id, isRead: false },
      })
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="flex flex-col md:flex-row">
        <aside className="w-full space-y-8 border-r border-white/10 p-6 backdrop-blur-xl md:w-72">
          <h1 className="text-2xl font-semibold tracking-tight">EarnHub</h1>

          <nav className="space-y-4 text-sm">
            <Link
              href="/dashboard/user"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <LayoutDashboard size={18} />
              Overview
            </Link>

            <Link
              href="/dashboard/user/tasks"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <ListChecks size={18} />
              Tasks
            </Link>

            <Link
              href="/dashboard/user/submissions"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <ClipboardCheck size={18} />
              Submissions
            </Link>

            <Link
              href="/dashboard/user/wallet"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <Wallet size={18} />
              Wallet
            </Link>

            <Link
              href="/dashboard/user/withdrawals"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <ArrowUpCircle size={18} />
              Withdrawals
            </Link>

            <Link
              href="/dashboard/user/notifications"
              className="flex items-center justify-between text-white/70 transition hover:text-white"
            >
              <span className="flex items-center gap-3">
                <Bell size={18} />
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-black">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          </nav>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
