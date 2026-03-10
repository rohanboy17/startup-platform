"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function AdminCampaignActions({
  campaignId,
  currentStatus,
  queueAgeHours,
  escalatedAt,
  escalationReason,
  initialTitle,
  initialDescription,
  initialCategory,
  initialTaskLink,
  initialRewardPerTask,
  initialTotalBudget,
}: {
  campaignId: string;
  currentStatus: "PENDING" | "APPROVED" | "REJECTED" | "LIVE" | "COMPLETED";
  queueAgeHours: number;
  escalatedAt: string | null;
  escalationReason: string | null;
  initialTitle: string;
  initialDescription: string;
  initialCategory: string;
  initialTaskLink: string | null;
  initialRewardPerTask: number;
  initialTotalBudget: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory);
  const [taskLink, setTaskLink] = useState(initialTaskLink || "");
  const [rewardPerTask, setRewardPerTask] = useState(String(initialRewardPerTask));
  const [totalBudget, setTotalBudget] = useState(String(initialTotalBudget));
  const [escalationNote, setEscalationNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const canEscalate = currentStatus === "PENDING" && queueAgeHours >= 4;
  const canApprove = currentStatus === "PENDING";
  const canReject = currentStatus === "PENDING";
  const canMarkLive = currentStatus === "APPROVED";
  const canPause = currentStatus === "LIVE";
  const canResume = currentStatus === "APPROVED";
  const canComplete = currentStatus === "LIVE" || currentStatus === "APPROVED";
  const canEdit = currentStatus !== "COMPLETED";
  const canDelete = currentStatus !== "LIVE" && currentStatus !== "COMPLETED";

  async function update(
    action:
      | "APPROVE"
      | "REJECT"
      | "LIVE"
      | "PAUSE"
      | "RESUME"
      | "COMPLETE"
      | "ESCALATE"
      | "CLEAR_ESCALATION"
  ) {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action,
        reason: action === "ESCALATE" ? escalationNote : undefined,
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Update failed");
      return;
    }

    setMessage(data.message || "Updated");
    if (action === "ESCALATE") {
      setEscalationNote("");
    }
    router.refresh();
    emitDashboardLiveRefresh();
  }

  async function saveEdit() {
    setLoading("EDIT");
    setMessage("");

    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title,
        description,
        category,
        taskLink: taskLink || null,
        rewardPerTask: Number(rewardPerTask),
        totalBudget: Number(totalBudget),
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Update failed");
      return;
    }

    setMessage(data.message || "Campaign updated");
    setEditOpen(false);
    router.refresh();
    emitDashboardLiveRefresh();
  }

  async function removeCampaign() {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) {
      return;
    }

    setLoading("DELETE");
    setMessage("");

    const res = await fetch(`/api/v2/admin/campaigns/${campaignId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Delete failed");
      return;
    }

    setMessage(data.message || "Campaign deleted");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canApprove ? (
          <Button onClick={() => update("APPROVE")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "APPROVE" ? "Approving..." : "Approve"}
          </Button>
        ) : null}
        {canMarkLive ? (
          <Button onClick={() => update("LIVE")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "LIVE" ? "Publishing..." : "Mark Live"}
          </Button>
        ) : null}
        {canPause ? (
          <Button onClick={() => update("PAUSE")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "PAUSE" ? "Pausing..." : "Pause"}
          </Button>
        ) : null}
        {canResume ? (
          <Button onClick={() => update("RESUME")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "RESUME" ? "Resuming..." : "Resume"}
          </Button>
        ) : null}
        {canComplete ? (
          <Button onClick={() => update("COMPLETE")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "COMPLETE" ? "Completing..." : "Force Complete"}
          </Button>
        ) : null}
        {canReject ? (
          <Button variant="destructive" onClick={() => update("REJECT")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "REJECT" ? "Rejecting..." : "Reject"}
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" onClick={() => setEditOpen((v) => !v)} disabled={loading !== null} className="w-full sm:w-auto">
            {editOpen ? "Close Edit" : "Edit"}
          </Button>
        ) : null}
        {canDelete ? (
          <Button variant="destructive" onClick={removeCampaign} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "DELETE" ? "Deleting..." : "Delete"}
          </Button>
        ) : null}
        {canEscalate ? (
          <Button variant="outline" onClick={() => update("ESCALATE")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "ESCALATE" ? "Escalating..." : "Escalate"}
          </Button>
        ) : null}
        {escalatedAt ? (
          <Button variant="outline" onClick={() => update("CLEAR_ESCALATION")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "CLEAR_ESCALATION" ? "Clearing..." : "Clear Escalation"}
          </Button>
        ) : null}
      </div>
      {canEscalate ? (
        <input
          value={escalationNote}
          onChange={(e) => setEscalationNote(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Escalation reason (optional)"
        />
      ) : null}
      {escalatedAt ? (
        <p className="text-xs text-amber-300">
          Escalated: {new Date(escalatedAt).toLocaleString()}
          {escalationReason ? ` | ${escalationReason}` : ""}
        </p>
      ) : null}

      {editOpen ? (
        <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Title"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Category"
          />
          <input
            value={taskLink}
            onChange={(e) => setTaskLink(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
            placeholder="Task link (optional)"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[70px] rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
            placeholder="Description"
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={rewardPerTask}
            onChange={(e) => setRewardPerTask(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Reward per task"
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Total budget"
          />
          <Button onClick={saveEdit} disabled={loading !== null} className="md:col-span-2">
            {loading === "EDIT" ? "Saving..." : "Save Campaign Changes"}
          </Button>
        </div>
      ) : null}

      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}
