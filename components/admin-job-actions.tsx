"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import AdminJobEditor from "@/components/admin-job-editor";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type JobStatus = "OPEN" | "PAUSED" | "CLOSED" | "FILLED";
type JobAction = "PAUSE" | "REOPEN" | "CLOSE" | "FILL";

export default function AdminJobActions({
  jobId,
  currentStatus,
  initialJob,
}: {
  jobId: string;
  currentStatus: JobStatus;
  initialJob: {
    title: string;
    description: string;
    jobCategory: string;
    jobType: string;
    customJobType: string | null;
    workMode: string;
    employmentType: string;
    city: string;
    state: string;
    pincode: string | null;
    addressLine: string | null;
    latitude: number | null;
    longitude: number | null;
    hiringRadiusKm: number | null;
    openings: number;
    payAmount: number;
    payUnit: string;
    shiftSummary: string | null;
    startDate: string | null;
    applicationDeadline: string | null;
    requiredSkills: string[];
    requiredLanguages: string[];
    minEducation: string | null;
  };
}) {
  const t = useTranslations("admin.jobsPage");
  const router = useRouter();
  const [loading, setLoading] = useState<JobAction | "">("");
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  async function update(action: JobAction) {
    setLoading(action);
    setMessage("");

    const res = await fetch(`/api/v2/admin/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: t("errors.unexpectedServerResponse") };
    }

    setLoading("");
    if (!res.ok) {
      setMessage(data.error || t("errors.updateFailed"));
      return;
    }

    setMessage(data.message || t("messages.updated"));
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditOpen((prev) => !prev)} disabled={loading !== ""}>
          {editOpen ? t("actions.closeEdit") : t("actions.edit")}
        </Button>
        {currentStatus === "OPEN" ? (
          <Button variant="outline" onClick={() => void update("PAUSE")} disabled={loading !== ""}>
            {loading === "PAUSE" ? t("actions.pausing") : t("actions.pause")}
          </Button>
        ) : null}
        {["PAUSED", "CLOSED", "FILLED"].includes(currentStatus) ? (
          <Button variant="outline" onClick={() => void update("REOPEN")} disabled={loading !== ""}>
            {loading === "REOPEN" ? t("actions.reopening") : t("actions.reopen")}
          </Button>
        ) : null}
        {currentStatus !== "FILLED" ? (
          <Button variant="outline" onClick={() => void update("FILL")} disabled={loading !== ""}>
            {loading === "FILL" ? t("actions.markingFilled") : t("actions.markFilled")}
          </Button>
        ) : null}
        {currentStatus !== "CLOSED" ? (
          <Button variant="outline" onClick={() => void update("CLOSE")} disabled={loading !== ""}>
            {loading === "CLOSE" ? t("actions.closing") : t("actions.close")}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
      {editOpen ? (
        <AdminJobEditor
          jobId={jobId}
          initialJob={initialJob}
          onSaved={() => {
            setEditOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
