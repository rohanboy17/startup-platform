"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import {
  DEFAULT_TASK_CATEGORIES,
  type TaskCategoryOption,
  getTaskTypesForCategory,
  isValidTaskCategory,
  isValidTaskType,
} from "@/lib/task-categories";

export default function AdminCampaignActions({
  campaignId,
  currentStatus,
  queueAgeHours,
  escalatedAt,
  escalationReason,
  initialTitle,
  initialDescription,
  initialCategory,
  initialTaskCategory,
  initialTaskType,
  initialCustomTask,
  initialTaskLink,
  initialTutorialVideoUrl,
  initialRewardPerTask,
  initialTotalBudget,
  initialSubmissionMode,
  initialInstructions,
}: {
  campaignId: string;
  currentStatus: "PENDING" | "APPROVED" | "REJECTED" | "LIVE" | "COMPLETED";
  queueAgeHours: number;
  escalatedAt: string | null;
  escalationReason: string | null;
  initialTitle: string;
  initialDescription: string;
  initialCategory: string;
  initialTaskCategory: string;
  initialTaskType: string;
  initialCustomTask: string | null;
  initialTaskLink: string | null;
  initialTutorialVideoUrl: string | null;
  initialRewardPerTask: number;
  initialTotalBudget: number;
  initialSubmissionMode: "ONE_PER_USER" | "MULTIPLE_PER_USER";
  initialInstructions: string[];
}) {
  const t = useTranslations("admin.campaignActions");
  const router = useRouter();
  const [taskCategories, setTaskCategories] = useState<TaskCategoryOption[]>(DEFAULT_TASK_CATEGORIES);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory);
  const [taskCategory, setTaskCategory] = useState<string>(initialTaskCategory);
  const [taskType, setTaskType] = useState<string>(initialTaskType);
  const [customTask, setCustomTask] = useState(initialCustomTask || "");
  const [taskLink, setTaskLink] = useState(initialTaskLink || "");
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState(initialTutorialVideoUrl || "");
  const [instructionsText, setInstructionsText] = useState(initialInstructions.join("\n"));
  const [rewardPerTask, setRewardPerTask] = useState(String(initialRewardPerTask));
  const [totalBudget, setTotalBudget] = useState(String(initialTotalBudget));
  const [submissionMode, setSubmissionMode] = useState(initialSubmissionMode);
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
  const canDelete = currentStatus !== "COMPLETED";

  useEffect(() => {
    let active = true;
    async function loadTaskCategories() {
      const res = await fetch("/api/task-categories", { credentials: "include" });
      const raw = await res.text();
      if (!active) return;
      try {
        const data = raw ? (JSON.parse(raw) as { taskCategories?: TaskCategoryOption[] }) : {};
        if (data.taskCategories?.length) {
          setTaskCategories(data.taskCategories);
          if (!isValidTaskCategory(taskCategory, data.taskCategories)) {
            const nextTaskCategory = data.taskCategories[0]?.name || "Other";
            setTaskCategory(nextTaskCategory);
            setTaskType(getTaskTypesForCategory(nextTaskCategory, data.taskCategories)[0] || "Other");
          } else if (!isValidTaskType(taskCategory, taskType, data.taskCategories)) {
            setTaskType(getTaskTypesForCategory(taskCategory, data.taskCategories)[0] || "Other");
          }
        }
      } catch {
        // keep defaults
      }
    }
    void loadTaskCategories();
    return () => {
      active = false;
    };
  }, [taskCategory, taskType]);

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
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || t("errors.updateFailed"));
      return;
    }

    setMessage(data.message || t("messages.updated"));
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
        taskCategory,
        taskType,
        customTask: taskType === "Other" ? customTask.trim() || null : null,
        taskLink: taskLink || null,
        tutorialVideoUrl: tutorialVideoUrl || null,
        instructions: instructionsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        rewardPerTask: Number(rewardPerTask),
        totalBudget: Number(totalBudget),
        submissionMode,
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || t("errors.updateFailed"));
      return;
    }

    setMessage(data.message || t("messages.campaignUpdated"));
    setEditOpen(false);
    router.refresh();
    emitDashboardLiveRefresh();
  }

  async function removeCampaign() {
    if (!window.confirm(t("confirm.delete"))) {
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
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || t("errors.deleteFailed"));
      return;
    }

    setMessage(data.message || t("messages.campaignDeleted"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canApprove ? (
          <Button onClick={() => update("APPROVE")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "APPROVE" ? t("actions.approving") : t("actions.approve")}
          </Button>
        ) : null}
        {canMarkLive ? (
          <Button onClick={() => update("LIVE")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "LIVE" ? t("actions.publishing") : t("actions.markLive")}
          </Button>
        ) : null}
        {canPause ? (
          <Button onClick={() => update("PAUSE")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "PAUSE" ? t("actions.pausing") : t("actions.pause")}
          </Button>
        ) : null}
        {canResume ? (
          <Button onClick={() => update("RESUME")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "RESUME" ? t("actions.resuming") : t("actions.resume")}
          </Button>
        ) : null}
        {canComplete ? (
          <Button onClick={() => update("COMPLETE")} disabled={loading !== null} variant="secondary" className="w-full sm:w-auto">
            {loading === "COMPLETE" ? t("actions.completing") : t("actions.forceComplete")}
          </Button>
        ) : null}
        {canReject ? (
          <Button variant="destructive" onClick={() => update("REJECT")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "REJECT" ? t("actions.rejecting") : t("actions.reject")}
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" onClick={() => setEditOpen((v) => !v)} disabled={loading !== null} className="w-full sm:w-auto">
            {editOpen ? t("actions.closeEdit") : t("actions.edit")}
          </Button>
        ) : null}
        {canDelete ? (
          <Button variant="destructive" onClick={removeCampaign} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "DELETE" ? t("actions.deleting") : t("actions.delete")}
          </Button>
        ) : null}
        {canEscalate ? (
          <Button variant="outline" onClick={() => update("ESCALATE")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "ESCALATE" ? t("actions.escalating") : t("actions.escalate")}
          </Button>
        ) : null}
        {escalatedAt ? (
          <Button variant="outline" onClick={() => update("CLEAR_ESCALATION")} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "CLEAR_ESCALATION" ? t("actions.clearing") : t("actions.clearEscalation")}
          </Button>
        ) : null}
      </div>
      {canEscalate ? (
        <input
          value={escalationNote}
          onChange={(e) => setEscalationNote(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder={t("fields.escalationReason")}
        />
      ) : null}
      {escalatedAt ? (
        <p className="text-xs text-amber-300">
          {t("labels.escalatedAt", { date: new Date(escalatedAt).toLocaleString() })}
          {escalationReason ? ` | ${escalationReason}` : ""}
        </p>
      ) : null}

      {editOpen ? (
        <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder={t("fields.title")}
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder={t("fields.category")}
          />
          <select
            value={taskCategory}
            onChange={(e) => {
              const nextTaskCategory = e.target.value;
              setTaskCategory(nextTaskCategory);
              setTaskType(getTaskTypesForCategory(nextTaskCategory, taskCategories)[0] || "Other");
              setCustomTask("");
            }}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {taskCategories.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {getTaskTypesForCategory(taskCategory, taskCategories).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {taskType === "Other" ? (
            <input
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
              placeholder={t("fields.customTask")}
            />
          ) : null}
          <input
            value={taskLink}
            onChange={(e) => setTaskLink(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
            placeholder={t("fields.taskLink")}
          />
          <input
            value={tutorialVideoUrl}
            onChange={(e) => setTutorialVideoUrl(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
            placeholder={t("fields.tutorialVideoUrl")}
          />
          <textarea
            value={instructionsText}
            onChange={(e) => setInstructionsText(e.target.value)}
            className="min-h-[96px] rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
            placeholder={t("fields.instructions")}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[70px] rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
            placeholder={t("fields.description")}
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={rewardPerTask}
            onChange={(e) => setRewardPerTask(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder={t("fields.rewardPerTask")}
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder={t("fields.totalBudget")}
          />
          <select
            value={submissionMode}
            onChange={(e) => setSubmissionMode(e.target.value as "ONE_PER_USER" | "MULTIPLE_PER_USER")}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white md:col-span-2"
          >
            <option value="ONE_PER_USER">{t("submissionModes.onePerUser")}</option>
            <option value="MULTIPLE_PER_USER">{t("submissionModes.multiplePerUser")}</option>
          </select>
          <Button onClick={saveEdit} disabled={loading !== null} className="md:col-span-2">
            {loading === "EDIT" ? t("actions.saving") : t("actions.saveCampaignChanges")}
          </Button>
        </div>
      ) : null}

      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}
