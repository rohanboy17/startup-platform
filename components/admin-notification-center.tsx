"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHydrated } from "@/lib/use-hydrated";

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

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: string;
};

type NotificationFilter = "ALL" | "UNREAD" | "SUCCESS" | "WARNING" | "INFO";

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "SUCCESS", label: "Success" },
  { value: "WARNING", label: "Warnings" },
  { value: "INFO", label: "Info" },
];

export default function AdminNotificationCenter({
  templates,
  notifications,
  totalCount,
  typeCounts,
  selectedLimit,
  selectedLogStatus,
  logs,
}: {
  templates: Template[];
  notifications: NotificationItem[];
  totalCount: number;
  typeCounts: {
    success: number;
    warning: number;
    info: number;
  };
  selectedLimit: string;
  selectedLogStatus: "ALL" | "SENT" | "FAILED" | "SKIPPED";
  logs: DeliveryLog[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [inboxItems, setInboxItems] = useState<NotificationItem[]>(notifications);
  const [segment, setSegment] = useState("ALL");
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
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
  const unreadNotifications = useMemo(
    () => inboxItems.filter((item) => !item.isRead),
    [inboxItems]
  );
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "UNREAD":
        return inboxItems.filter((item) => !item.isRead);
      case "SUCCESS":
      case "WARNING":
      case "INFO":
        return inboxItems.filter((item) => item.type === filter);
      default:
        return inboxItems;
    }
  }, [filter, inboxItems]);

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

  async function markRead(notificationId?: string) {
    setLoading(notificationId ?? "mark-all");
    setFeedback("");

    const res = await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(notificationId ? { notificationId } : { all: true }),
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }

    setLoading(null);
    setFeedback(data.message || data.error || "Done");
    if (res.ok) {
      setInboxItems((current) =>
        current.map((item) =>
          !notificationId || item.id === notificationId ? { ...item, isRead: true } : item
        )
      );
      router.refresh();
    }
  }

  function typeTone(type: string, isRead: boolean) {
    if (isRead) return "border-foreground/10 bg-background/50 text-foreground";
    if (type === "SUCCESS") return "border-emerald-400/25 bg-emerald-500/10 text-foreground";
    if (type === "WARNING") return "border-amber-400/25 bg-amber-500/10 text-foreground";
    return "border-sky-400/25 bg-sky-500/10 text-foreground";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Admin Inbox</h3>
            <p className="text-sm text-foreground/60">
              Review your own alerts before checking delivery logs and broadcast history.
            </p>
          </div>
          <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              name="limit"
              defaultValue={selectedLimit}
              className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground sm:min-w-[120px]"
            >
              <option value="5">Show 5</option>
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="ALL">Show all</option>
            </select>
            <select
              name="logStatus"
              defaultValue={selectedLogStatus}
              className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground sm:min-w-[140px]"
            >
              <option value="ALL">All logs</option>
              <option value="FAILED">Failed logs</option>
              <option value="SENT">Sent logs</option>
              <option value="SKIPPED">Skipped logs</option>
            </select>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Apply
            </Button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-sm text-foreground/60">Total inbox items</p>
            <p className="mt-2 text-2xl font-semibold">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-sm text-foreground/60">Unread</p>
            <p className="mt-2 text-2xl font-semibold">{unreadNotifications.length}</p>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-sm text-foreground/60">Success</p>
            <p className="mt-2 text-2xl font-semibold">{typeCounts.success}</p>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-sm text-foreground/60">Warnings</p>
            <p className="mt-2 text-2xl font-semibold">{typeCounts.warning}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-foreground/60">Notifications</p>
            <h4 className="text-base font-semibold">Mark updates as read from here</h4>
          </div>
          <Button
            variant="outline"
            onClick={() => void markRead()}
            disabled={loading !== null || inboxItems.every((item) => item.isRead)}
            className="w-full sm:w-auto"
          >
            {loading === "mark-all" ? "Updating..." : "Mark all read"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  active
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                    : "border-foreground/10 bg-background/50 text-foreground/70 hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {filteredNotifications.length === 0 ? (
          <p className="text-sm text-foreground/60">No admin notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${typeTone(item.type, item.isRead)}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{item.title}</p>
                    <p className="mt-1 break-words text-sm opacity-80">{item.message}</p>
                  </div>
                  {!item.isRead ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void markRead(item.id)}
                      disabled={loading !== null}
                      className="w-full lg:w-auto"
                    >
                      {loading === item.id ? "Saving..." : "Mark read"}
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs opacity-70">
                  <span suppressHydrationWarning>
                    {hydrated ? new Date(item.createdAt).toLocaleString() : ""}
                  </span>
                  <StatusBadge
                    label={item.type}
                    tone={item.type === "SUCCESS" ? "success" : item.type === "WARNING" ? "warning" : "info"}
                  />
                  {!item.isRead ? <StatusBadge label="Unread" tone="neutral" /> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Broadcast</h3>
        <select
          className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
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
          className="min-h-[90px] w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
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
              className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/60 px-3 py-3 text-sm text-foreground/80"
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

      <div className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Template Manager</h3>
        <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="template.key" />
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Template name" />
        <select
          className="w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
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
          className="min-h-[90px] w-full rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          placeholder="Body (supports {{var}} tokens)"
        />
        <Button onClick={saveTemplate} disabled={loading !== null} className="w-full sm:w-auto">Save Template</Button>

        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 rounded-md border border-foreground/10 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="break-all font-medium">{t.key}</p>
                <p className="text-xs text-foreground/60">{t.name} | {t.channel} | {t.enabled ? "enabled" : "disabled"}</p>
              </div>
              <Button variant="outline" onClick={() => toggleTemplate(t.id, t.enabled)} disabled={loading !== null} className="w-full sm:w-auto">
                {t.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-foreground/10 bg-background/50 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Delivery Logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-foreground/60">No delivery logs match the current filter.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-md border border-foreground/10 bg-background/60 p-3 text-sm">
              <p className="break-all font-medium">{log.status} | {log.channel} | {log.user.email}</p>
              <p className="text-xs text-foreground/60">template={log.templateKey || "-"} | {log.createdAtLabel}</p>
              {log.error ? <p className="text-xs text-rose-600 dark:text-rose-300">{log.error}</p> : null}
            </div>
          ))
        )}
      </div>

      {feedback ? <p className="text-sm text-foreground/70">{feedback}</p> : null}
    </div>
  );
}
