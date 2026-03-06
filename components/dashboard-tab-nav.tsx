"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Menu,
  X,
  BarChart3,
  Bell,
  CircleDollarSign,
  ClipboardCheck,
  House,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PlusCircle,
  ScrollText,
  Users,
  Wallet,
  ArrowUpCircle,
} from "lucide-react";
import { useLiveRefresh } from "@/lib/live-refresh";
import LogoutButton from "@/components/logout-button";

type DashboardRole = "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
type IconName =
  | "overview"
  | "campaigns"
  | "reviews"
  | "users"
  | "withdrawals"
  | "revenue"
  | "audit"
  | "analytics"
  | "create"
  | "funding"
  | "tasks"
  | "submissions"
  | "wallet"
  | "notifications";

type Item = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  matchPrefix?: string;
};

const iconMap: Record<IconName, ComponentType<{ size?: number }>> = {
  overview: LayoutDashboard,
  campaigns: Megaphone,
  reviews: ClipboardCheck,
  users: Users,
  withdrawals: ArrowUpCircle,
  revenue: Landmark,
  audit: ScrollText,
  analytics: BarChart3,
  create: PlusCircle,
  funding: CircleDollarSign,
  tasks: ListChecks,
  submissions: ClipboardCheck,
  wallet: Wallet,
  notifications: Bell,
};

type NavAlertsResponse = {
  tabs: Record<string, string>;
  counts?: Record<string, number>;
};

export default function DashboardTabNav({
  title,
  displayName,
  role,
  userId,
  items,
}: {
  title: string;
  displayName: string;
  role: DashboardRole;
  userId: string;
  items: Item[];
}) {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const storagePrefix = `nav_seen:${userId}:`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/nav-alerts?role=${role}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as NavAlertsResponse;
    setAlerts(body.tabs || {});
    setCounts(body.counts || {});
  }, [role]);

  useLiveRefresh(load, 10000);

  useEffect(() => {
    if (!pathname) return;
    for (const item of items) {
      const isCurrent = item.matchPrefix
        ? pathname === item.href || pathname.startsWith(item.matchPrefix)
        : pathname === item.href;
      if (!isCurrent) continue;
      const latest = alerts[item.key] || "";
      if (!latest) continue;
      const existing = window.localStorage.getItem(`${storagePrefix}${item.key}`) || "";
      if (existing !== latest) {
        window.localStorage.setItem(`${storagePrefix}${item.key}`, latest);
      }
    }
  }, [alerts, items, pathname, storagePrefix]);

  const itemsWithState = useMemo(
    () =>
      items.map((item) => {
        const Icon = iconMap[item.icon];
        const latest = alerts[item.key] || "";
        const seenToken =
          typeof window !== "undefined"
            ? window.localStorage.getItem(`${storagePrefix}${item.key}`) || ""
            : "";
        const isCurrent = item.matchPrefix
          ? pathname === item.href || pathname.startsWith(item.matchPrefix)
          : pathname === item.href;
        const showDot = !!latest && latest !== seenToken && !isCurrent;
        const badgeCount = counts[item.key] ?? 0;
        return { ...item, Icon, showDot, badgeCount };
      }),
    [alerts, counts, items, pathname, storagePrefix]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between md:block">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-white/90 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div
        className={`${mobileOpen ? "block" : "hidden"} space-y-6 rounded-lg border border-white/10 bg-white/5 p-4 md:block md:rounded-none md:border-0 md:bg-transparent md:p-0`}
      >
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border md:bg-white/5">
          <p className="text-xs text-white/50">Signed in as</p>
          <p className="text-sm font-medium text-white/90">{displayName}</p>
        </div>

        <nav className="max-h-[45vh] space-y-4 overflow-y-auto pr-1 text-sm md:max-h-none md:overflow-visible md:pr-0">
          {itemsWithState.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between text-white/70 transition hover:text-white"
            >
              <span className="flex items-center gap-3">
                <item.Icon size={18} />
                {item.label}
              </span>
              {item.badgeCount > 0 ? (
                <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-black">
                  {item.badgeCount}
                </span>
              ) : item.showDot ? (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="pt-2">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="mb-3 flex items-center gap-3 text-sm text-white/70 transition hover:text-white"
          >
            <House size={18} />
            Home
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export function HomeNavLink() {
  return (
    <Link href="/" className="mb-3 flex items-center gap-3 text-sm text-white/70 transition hover:text-white">
      <House size={18} />
      Home
    </Link>
  );
}
