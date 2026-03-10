"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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
      setError("Unexpected server response");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError((body as { error?: string }).error || "Failed to load business team");
    } else {
      setData(body as TeamResponse);
      setError("");
    }

    setLoading(false);
  }, []);

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
      body = { error: "Unexpected server response" };
    }

    setBusy("");

    if (!res.ok) {
      setError(body.error || "Failed to add team member");
      return;
    }

    setEmail("");
    setMessage(body.message || "Team member added");
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
      setError(body.error || "Failed to update role");
      return;
    }

    setMessage(body.message || "Role updated");
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
      setError(body.error || "Failed to remove member");
      return;
    }

    setMessage(body.message || "Member removed");
    emitDashboardLiveRefresh();
    void load();
  }

  if (loading) return <p className="text-sm text-white/60">Loading team...</p>;
  if (error && !data) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return null;

  const canManage = data.actorRole === "OWNER";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <p className="text-sm text-white/60">Owner</p>
          <p className="mt-2 text-lg font-semibold text-white">{data.owner?.name || data.owner?.email || "-"}</p>
          <p className="mt-1 text-xs text-white/45">{data.owner?.email}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <p className="text-sm text-white/60">Team members</p>
          <p className="mt-2 text-3xl font-semibold text-white">{data.members.length}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <p className="text-sm text-white/60">Your access</p>
          <p className="mt-2 text-3xl font-semibold text-white">{data.actorRole}</p>
        </div>
      </div>

      {canManage ? (
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div>
            <p className="text-sm text-white/60">Add team member</p>
            <h3 className="text-xl font-semibold text-white">Attach an existing business account</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_160px]">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Business account email"
            />
            <select
              value={accessRole}
              onChange={(e) => setAccessRole(e.target.value as "EDITOR" | "VIEWER")}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <Button type="button" onClick={() => void addMember()} disabled={busy === "add"}>
              {busy === "add" ? "Adding..." : "Add member"}
            </Button>
          </div>
          <p className="text-xs text-white/45">
            Team members must already exist as business accounts. Owners keep funding, settings, and team control.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/60 backdrop-blur-md">
          Team membership is managed only by the business owner.
        </div>
      )}

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <div>
          <p className="text-sm text-white/60">Workspace members</p>
          <h3 className="text-xl font-semibold text-white">Owner, editors, and viewers</h3>
        </div>

        {data.members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
            No team members added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">{member.name || member.email}</p>
                  <p className="text-xs text-white/45">{member.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                    {member.accessRole}
                  </span>

                  {canManage ? (
                    <>
                      <select
                        value={member.accessRole}
                        onChange={(e) => void updateRole(member.id, e.target.value as "EDITOR" | "VIEWER")}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                        disabled={busy === `role:${member.id}`}
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void removeMember(member.id)}
                        disabled={busy === `remove:${member.id}`}
                      >
                        {busy === `remove:${member.id}` ? "Removing..." : "Remove"}
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
