"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type AccessRole = "OWNER" | "EDITOR" | "VIEWER";

type TeamResponse = {
  actorRole: AccessRole;
  owner: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  } | null;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    accessRole: AccessRole;
    createdAt: string;
  }>;
};

export default function BusinessTeamPanel() {
  const t = useTranslations("business.teamPanel");
  const router = useRouter();
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [accessRole, setAccessRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/team", { credentials: "include" });
    const raw = await res.text();
    let body: TeamResponse | { error?: string } = {};

    try {
      body = raw ? (JSON.parse(raw) as TeamResponse | { error?: string }) : {};
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError((body as { error?: string }).error || t("errors.failedToLoad"));
    } else {
      setData(body as TeamResponse);
      setError("");
    }

    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 15000);

  async function addMember() {
    setBusy("add");
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/business/team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, accessRole }),
    });

    const raw = await res.text();
    let body: { error?: string; message?: string } = {};
    try {
      body = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      body = { error: t("errors.unexpectedServerResponse") };
    }

    setBusy("");

    if (!res.ok) {
      setError(body.error || t("errors.failedToAdd"));
      return;
    }

    setEmail("");
    setMessage(body.message || t("messages.memberAdded"));
    emitDashboardLiveRefresh();
    router.refresh();
    void load();
  }

  async function updateRole(memberId: string, nextRole: "EDITOR" | "VIEWER") {
    setBusy(`role:${memberId}`);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/business/team", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId, accessRole: nextRole }),
    });

    const raw = await res.text();
    const body = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setBusy("");

    if (!res.ok) {
      setError(body.error || t("errors.failedToUpdateRole"));
      return;
    }

    setMessage(body.message || t("messages.roleUpdated"));
    emitDashboardLiveRefresh();
    void load();
  }

  async function removeMember(memberId: string) {
    setBusy(`remove:${memberId}`);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/business/team", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId }),
    });

    const raw = await res.text();
    const body = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setBusy("");

    if (!res.ok) {
      setError(body.error || t("errors.failedToRemove"));
      return;
    }

    setMessage(body.message || t("messages.memberRemoved"));
    emitDashboardLiveRefresh();
    void load();
  }

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return null;

  const canManage = data.actorRole === "OWNER";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-foreground/10 bg-background/50 p-5 backdrop-blur-md">
          <p className="text-sm text-foreground/60">{t("kpis.owner")}</p>
          <p className="mt-2 break-words text-lg font-semibold text-foreground">{data.owner?.name || data.owner?.email || "-"}</p>
          <p className="mt-1 break-all text-xs text-foreground/45">{data.owner?.email}</p>
        </div>
        <div className="rounded-3xl border border-foreground/10 bg-background/50 p-5 backdrop-blur-md">
          <p className="text-sm text-foreground/60">{t("kpis.teamMembers")}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{data.members.length}</p>
        </div>
        <div className="rounded-3xl border border-foreground/10 bg-background/50 p-5 backdrop-blur-md">
          <p className="text-sm text-foreground/60">{t("kpis.yourAccess")}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{data.actorRole}</p>
        </div>
      </div>

      {canManage ? (
        <div className="space-y-4 rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">{t("add.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("add.title")}</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_160px]">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("add.emailPlaceholder")}
            />
            <select
              value={accessRole}
              onChange={(e) => setAccessRole(e.target.value as "EDITOR" | "VIEWER")}
              className="w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
            >
              <option value="EDITOR">{t("roles.editor")}</option>
              <option value="VIEWER">{t("roles.viewer")}</option>
            </select>
            <Button type="button" onClick={() => void addMember()} disabled={busy === "add"} className="w-full md:w-auto">
              {busy === "add" ? t("add.adding") : t("add.addButton")}
            </Button>
          </div>
          <p className="text-xs text-foreground/45">
            {t("add.help")}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-foreground/10 bg-background/50 p-6 text-sm text-foreground/60 backdrop-blur-md">
          {t("notOwner")}
        </div>
      )}

      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

      <div className="space-y-4 rounded-3xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md sm:p-6">
        <div>
          <p className="text-sm text-foreground/60">{t("members.eyebrow")}</p>
          <h3 className="text-xl font-semibold text-foreground">{t("members.title")}</h3>
        </div>

        {data.members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-foreground/10 bg-background/60 p-4 text-sm text-foreground/50">
            {t("members.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-background/60 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name || member.email}</p>
                  <p className="break-all text-xs text-foreground/45">{member.email}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/70">
                    {member.accessRole}
                  </span>

                  {canManage ? (
                    <>
                      <select
                        value={member.accessRole}
                        onChange={(e) => void updateRole(member.id, e.target.value as "EDITOR" | "VIEWER")}
                        className="w-full rounded-xl border border-foreground/15 bg-background/70 px-3 py-2 text-sm text-foreground outline-none sm:w-auto"
                        disabled={busy === `role:${member.id}`}
                      >
                        <option value="EDITOR">{t("roles.editor")}</option>
                        <option value="VIEWER">{t("roles.viewer")}</option>
                      </select>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void removeMember(member.id)}
                        disabled={busy === `remove:${member.id}`}
                        className="w-full sm:w-auto"
                      >
                        {busy === `remove:${member.id}` ? t("members.removing") : t("members.remove")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
