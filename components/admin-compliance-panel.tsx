"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Evidence = {
  id: string;
  entityType: string;
  entityId: string;
  note: string | null;
  fileUrl: string | null;
  createdAt: string;
};

export default function AdminCompliancePanel({ initialEvidence }: { initialEvidence: Evidence[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [entityType, setEntityType] = useState("DISPUTE");
  const [entityId, setEntityId] = useState("");
  const [note, setNote] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function runUserAction(action: "SOFT_DELETE" | "RESTORE" | "ANONYMIZE") {
    if (!userId.trim()) {
      setMessage("User ID required");
      return;
    }

    setLoading(action);
    const res = await fetch(`/api/admin/compliance/users/${userId.trim()}/delete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, reason }),
    });

    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setLoading(null);
    setMessage(data.message || data.error || "Done");
    if (res.ok) router.refresh();
  }

  async function addEvidence() {
    setLoading("evidence");
    const res = await fetch("/api/admin/compliance/legal-evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entityType, entityId, note, fileUrl }),
    });
    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setLoading(null);
    setMessage(data.message || data.error || "Done");
    if (res.ok) {
      setEntityId("");
      setNote("");
      setFileUrl("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Privacy Compliance: User Export/Delete</h3>
        <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={userId ? `/api/admin/compliance/users/${userId}/export` : "#"}
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-center text-sm"
          >
            Export JSON
          </a>
          <Button onClick={() => runUserAction("SOFT_DELETE")} disabled={loading !== null} className="w-full sm:w-auto">Soft Delete</Button>
          <Button variant="outline" onClick={() => runUserAction("RESTORE")} disabled={loading !== null} className="w-full sm:w-auto">Restore</Button>
          <Button variant="outline" onClick={() => runUserAction("ANONYMIZE")} disabled={loading !== null} className="w-full sm:w-auto">Anonymize</Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Legal Evidence Logs</h3>
        <Input placeholder="Entity type (e.g. WITHDRAWAL_DISPUTE)" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
        <Input placeholder="Entity ID" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm"
          placeholder="Evidence note"
        />
        <Input placeholder="File URL (optional)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
        <Button onClick={addEvidence} disabled={loading !== null} className="w-full sm:w-auto">{loading === "evidence" ? "Saving..." : "Add Evidence"}</Button>

        <div className="space-y-2">
          {initialEvidence.map((item) => (
            <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
              <p className="break-all font-medium">{item.entityType} | {item.entityId}</p>
              <p className="text-xs text-white/60">{new Date(item.createdAt).toLocaleString()}</p>
              {item.note ? <p className="text-xs text-white/70">{item.note}</p> : null}
              {item.fileUrl ? <p className="break-all text-xs text-sky-300">{item.fileUrl}</p> : null}
            </div>
          ))}
        </div>
      </div>

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
