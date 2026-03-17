"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AssignmentRow = {
  id: string;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    category: string;
    status: string;
    rewardPerTask: number;
    remainingBudget: number;
    totalBudget: number;
  };
  assignedBy: { id: string; name: string | null; email: string };
};

type AssignableCampaign = {
  id: string;
  title: string;
  category: string;
  status: string;
  rewardPerTask: number;
  remainingBudget: number;
  totalBudget: number;
  submissionMode: "ONE_PER_USER" | "MULTIPLE_PER_USER";
  createdAt: string;
  assignedUsers: number;
};

export default function AdminUserWorkAssignments({
  userId,
  userSkills,
}: {
  userId: string;
  userSkills: string[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [campaigns, setCampaigns] = useState<AssignableCampaign[]>([]);
  const [query, setQuery] = useState("");

  async function loadAssignments() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/v2/admin/users/${userId}/assignments`, { credentials: "include" });
    const raw = await res.text();
    let parsed: { assignments?: AssignmentRow[]; error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { assignments?: AssignmentRow[]; error?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }
    setLoading(false);
    if (!res.ok) {
      setError(parsed.error || "Failed to load assignments");
      return;
    }
    setAssignments(parsed.assignments || []);
  }

  async function loadCampaigns() {
    const res = await fetch(`/api/v2/admin/campaigns/assignable?category=work`, { credentials: "include" });
    const raw = await res.text();
    let parsed: { campaigns?: AssignableCampaign[]; error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { campaigns?: AssignableCampaign[]; error?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load campaigns");
      return;
    }
    setCampaigns(parsed.campaigns || []);
  }

  useEffect(() => {
    if (!open) return;
    void loadAssignments();
    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const assignedCampaignIds = useMemo(
    () => new Set(assignments.map((a) => a.campaign.id)),
    [assignments]
  );

  const suggestedTokens = useMemo(() => {
    const tokens = userSkills
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean)
      .flatMap((s) => s.split(/[\s,]+/g))
      .filter((t) => t.length >= 3);
    return new Set(tokens);
  }, [userSkills]);

  const filteredCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? campaigns.filter((c) => c.title.toLowerCase().includes(q))
      : campaigns.slice();

    // Soft "suggested" ordering: campaigns whose title matches a skill token bubble to top.
    base.sort((a, b) => {
      const aSuggested = Array.from(suggestedTokens).some((t) => a.title.toLowerCase().includes(t));
      const bSuggested = Array.from(suggestedTokens).some((t) => b.title.toLowerCase().includes(t));
      if (aSuggested === bSuggested) return 0;
      return aSuggested ? -1 : 1;
    });

    return base;
  }, [campaigns, query, suggestedTokens]);

  async function assign(campaignId: string) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/v2/admin/users/${userId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ campaignId }),
    });
    const raw = await res.text();
    let parsed: { error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }
    setSaving(false);
    if (!res.ok) {
      setError(parsed.error || "Failed to assign user");
      return;
    }
    await loadAssignments();
  }

  async function unassign(campaignId: string) {
    if (!confirm("Remove this assignment?")) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/v2/admin/users/${userId}/assignments?campaignId=${encodeURIComponent(campaignId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const raw = await res.text();
    let parsed: { error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }
    setSaving(false);
    if (!res.ok) {
      setError(parsed.error || "Failed to remove assignment");
      return;
    }
    await loadAssignments();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Work assignments
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Work assignments</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">
                Assigned campaigns
              </p>
              <p className="mt-2 text-sm text-foreground/70">
                {loading ? "Loading..." : `${assignments.length} assigned`}
              </p>

              {error ? (
                <p className="mt-3 text-sm text-rose-500">{error}</p>
              ) : null}

              <div className="mt-4 space-y-2">
                {assignments.length === 0 && !loading ? (
                  <p className="text-sm text-foreground/60">No work campaigns assigned yet.</p>
                ) : null}
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.campaign.title}</p>
                      <p className="mt-1 text-xs text-foreground/60">
                        Status: {a.campaign.status} - Assigned{" "}
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => unassign(a.campaign.id)}
                      disabled={saving}
                      className="w-full sm:w-auto"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">
                Assign new work campaign
              </p>
              <p className="mt-2 text-sm text-foreground/70">
                Choose a campaign and assign this user. Only campaigns in category work show up here.
              </p>

              <div className="mt-4">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search campaigns..."
                  className="min-h-11"
                />
              </div>

              <div className="mt-4 grid max-h-[360px] gap-2 overflow-auto pr-1">
                {filteredCampaigns.length === 0 ? (
                  <p className="text-sm text-foreground/60">No work campaigns found.</p>
                ) : null}
                {filteredCampaigns.map((c) => {
                  const isAssigned = assignedCampaignIds.has(c.id);
                  const isSuggested = Array.from(suggestedTokens).some((t) => c.title.toLowerCase().includes(t));
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between",
                        isSuggested && "ring-1 ring-emerald-500/20"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.title}{" "}
                          {isSuggested ? (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                              Suggested
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-foreground/60">
                          {c.status} - Assigned users: {c.assignedUsers}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => assign(c.id)}
                        disabled={saving || isAssigned}
                        className="w-full sm:w-auto"
                      >
                        {isAssigned ? "Assigned" : "Assign"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
