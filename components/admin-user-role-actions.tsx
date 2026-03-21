"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type Role = "USER" | "BUSINESS" | "MANAGER" | "ADMIN";

export default function AdminUserRoleActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const t = useTranslations("admin.userRoleActions");
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveRole() {
    if (role === currentRole) {
      setMessage(t("noRoleChange"));
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(false);
    setMessage(data.message || data.error || t("updated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 sm:w-auto"
          disabled={loading}
        >
          <option value="USER">{t("roles.user")}</option>
          <option value="BUSINESS">{t("roles.business")}</option>
          <option value="MANAGER">{t("roles.manager")}</option>
          <option value="ADMIN">{t("roles.admin")}</option>
        </select>
        <Button onClick={saveRole} disabled={loading} className="w-full sm:w-auto">
          {loading ? t("saving") : t("updateRole")}
        </Button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
