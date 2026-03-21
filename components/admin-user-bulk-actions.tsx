"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
type Role = "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
type BulkAction = "SET_STATUS" | "SET_ROLE" | "FLAG" | "UNFLAG";

type BulkUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "BUSINESS" | "MANAGER" | "ADMIN";
};

export default function AdminUserBulkActions({ users }: { users: BulkUser[] }) {
  const t = useTranslations("admin.userBulkActions");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<BulkAction>("SET_STATUS");
  const [status, setStatus] = useState<AccountStatus>("SUSPENDED");
  const [role, setRole] = useState<Role>("USER");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectableUserIds = useMemo(
    () => users.filter((user) => user.role !== "ADMIN").map((user) => user.id),
    [users]
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelected(selectableUserIds);
  }

  function clearAll() {
    setSelected([]);
  }

  async function runBulk() {
    if (selected.length === 0) {
      setMessage(t("selectAtLeastOne"));
      return;
    }
    if (action === "SET_STATUS" && (status === "SUSPENDED" || status === "BANNED") && !reason.trim()) {
      setMessage(t("reasonRequired"));
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/users/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userIds: selected,
        action,
        status: action === "SET_STATUS" ? status : undefined,
        role: action === "SET_ROLE" ? role : undefined,
        reason,
      }),
    });

    const raw = await res.text();
    let data: {
      message?: string;
      error?: string;
      updated?: number;
      skipped?: number;
    } = {};

    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || t("bulkUpdateFailed"));
      return;
    }

    setMessage(t("doneMessage", { updated: data.updated ?? 0, skipped: data.skipped ?? 0 }));
    setSelected([]);
    setReason("");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-foreground/70">{t("title")}</p>
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground/70">
          {t("selected", { count: selected.length })}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" onClick={selectAll} disabled={loading} className="w-full sm:w-auto">
          {t("selectAll")}
        </Button>
        <Button type="button" variant="outline" onClick={clearAll} disabled={loading} className="w-full sm:w-auto">
          {t("clear")}
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as BulkAction)}
          className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          disabled={loading}
        >
          <option value="SET_STATUS">{t("actions.setStatus")}</option>
          <option value="SET_ROLE">{t("actions.setRole")}</option>
          <option value="FLAG">{t("actions.flag")}</option>
          <option value="UNFLAG">{t("actions.unflag")}</option>
        </select>

        {action === "SET_STATUS" ? (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AccountStatus)}
            className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            disabled={loading}
          >
            <option value="ACTIVE">{t("status.active")}</option>
            <option value="SUSPENDED">{t("status.suspended")}</option>
            <option value="BANNED">{t("status.banned")}</option>
          </select>
        ) : action === "SET_ROLE" ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            disabled={loading}
          >
            <option value="USER">{t("roles.user")}</option>
            <option value="BUSINESS">{t("roles.business")}</option>
            <option value="MANAGER">{t("roles.manager")}</option>
            <option value="ADMIN">{t("roles.admin")}</option>
          </select>
        ) : (
          <div />
        )}

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reasonPlaceholder")}
          className="rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 md:col-span-2"
          disabled={loading}
        />
      </div>

      <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-foreground/10 bg-background/40 p-2">
        {users.map((user) => (
          <label key={user.id} className="flex items-center gap-2 text-xs text-foreground/80">
            <input
              type="checkbox"
              checked={selected.includes(user.id)}
              disabled={loading || user.role === "ADMIN"}
              onChange={() => toggle(user.id)}
            />
            <span>
              {t("userLabel", { name: user.name || t("unnamed"), email: user.email, role: user.role })}
            </span>
          </label>
        ))}
      </div>

      <Button type="button" onClick={runBulk} disabled={loading} className="w-full sm:w-auto">
        {loading ? t("applying") : t("applyChanges")}
      </Button>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
