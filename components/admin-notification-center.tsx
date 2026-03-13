"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Template = {
  id: string;
  key: string;
  name: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM";
  subject: string | null;
  body: string;
  enabled: boolean;
};

type DeliveryLog = {
  id: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM";
  templateKey: string | null;
  error: string | null;
  createdAtLabel: string;
  user: { email: string; role: string; mobile?: string | null };
};

export default function AdminNotificationCenter({
  templates,
  logs,
}: {
  templates: Template[];
  logs: DeliveryLog[];
}) {
  const router = useRouter();
  const [segment, setSegment] = useState("ALL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [broadcastChannels, setBroadcastChannels] = useState<Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM">>(["IN_APP"]);
  const [newChannel, setNewChannel] = useState<"IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM">("IN_APP");

  function toggleBroadcastChannel(channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM") {
    setBroadcastChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  }
  const [templateKey, setTemplateKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newBody, setNewBody] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  async function sendBroadcast() {
    setLoading("broadcast");
    setFeedback("");
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ segment, title, message, templateKey: templateKey || undefined, channels: broadcastChannels }),
    });
    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setLoading(null);
    setFeedback(data.message || data.error || "Done");
    if (res.ok) router.refresh();
  }

  async function saveTemplate() {
    setLoading("template");
    setFeedback("");
    const res = await fetch("/api/admin/notifications/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key: newKey, name: newName, body: newBody, channel: newChannel, enabled: true }),
    });
    const raw = await res.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    setLoading(null);
    setFeedback(data.message || data.error || "Done");
    if (res.ok) {
      setNewKey("");
      setNewName("");
      setNewBody("");
      router.refresh();
    }
  }

  async function toggleTemplate(id: string, enabled: boolean) {
    setLoading(id);
    const res = await fetch("/api/admin/notifications/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, enabled: !enabled }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Broadcast</h3>
        <select
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="ALL">ALL</option>
          <option value="USER">USER</option>
          <option value="BUSINESS">BUSINESS</option>
          <option value="MANAGER">MANAGER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm"
          placeholder="Message"
        />
        <Input value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} placeholder="Template key (optional)" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {([
            ["IN_APP", "In-app"],
            ["EMAIL", "Email"],
            ["SMS", "SMS"],
            ["PUSH", "Push"],
            ["TELEGRAM", "Telegram"],
          ] as const).map(([channel, label]) => (
            <label
              key={channel}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/80"
            >
              <input
                type="checkbox"
                checked={broadcastChannels.includes(channel)}
                onChange={() => toggleBroadcastChannel(channel)}
                className="h-4 w-4"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <Button onClick={sendBroadcast} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "broadcast" ? "Sending..." : "Send Broadcast"}
        </Button>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Template Manager</h3>
        <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="template.key" />
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Template name" />
        <select
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm"
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value as typeof newChannel)}
        >
          <option value="IN_APP">IN_APP</option>
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
          <option value="PUSH">PUSH</option>
          <option value="TELEGRAM">TELEGRAM</option>
        </select>
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm"
          placeholder="Body (supports {{var}} tokens)"
        />
        <Button onClick={saveTemplate} disabled={loading !== null} className="w-full sm:w-auto">Save Template</Button>

        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 rounded-md border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="break-all font-medium">{t.key}</p>
                <p className="text-xs text-white/60">{t.name} | {t.channel} | {t.enabled ? "enabled" : "disabled"}</p>
              </div>
              <Button variant="outline" onClick={() => toggleTemplate(t.id, t.enabled)} disabled={loading !== null} className="w-full sm:w-auto">
                {t.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Delivery Logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-white/60">No logs yet.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
              <p className="break-all font-medium">{log.status} | {log.channel} | {log.user.email}</p>
              <p className="text-xs text-white/60">template={log.templateKey || "-"} | {log.createdAtLabel}</p>
              {log.error ? <p className="text-xs text-rose-300">{log.error}</p> : null}
            </div>
          ))
        )}
      </div>

      {feedback ? <p className="text-sm text-white/70">{feedback}</p> : null}
    </div>
  );
}
