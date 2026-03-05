import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  PlusCircle,
  CircleDollarSign,
} from "lucide-react";
import LogoutButton from "@/components/logout-button";

export default async function BusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

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

          <nav className="space-y-4 text-sm">
            <Link
              href="/dashboard/business"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <LayoutDashboard size={18} />
              Overview
            </Link>

            <Link
              href="/dashboard/business/campaigns"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <Megaphone size={18} />
              Campaigns
            </Link>

            <Link
              href="/dashboard/business/create"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <PlusCircle size={18} />
              Create Campaign
            </Link>

            <Link
              href="/dashboard/business/analytics"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <BarChart3 size={18} />
              Analytics
            </Link>

            <Link
              href="/dashboard/business/funding"
              className="flex items-center gap-3 text-white/70 transition hover:text-white"
            >
              <CircleDollarSign size={18} />
              Funding
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
