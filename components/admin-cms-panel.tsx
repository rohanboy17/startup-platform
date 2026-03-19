"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isActive: boolean;
};

export default function AdminCmsPanel({
  initialLandingHero,
  initialLandingSubtitle,
  initialTermsBody,
  initialPrivacyBody,
  initialRefundBody,
  initialFaqBody,
  flags,
  announcements,
}: {
  initialLandingHero: string;
  initialLandingSubtitle: string;
  initialTermsBody: string;
  initialPrivacyBody: string;
  initialRefundBody: string;
  initialFaqBody: string;
  flags: FeatureFlag[];
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [landingHero, setLandingHero] = useState(initialLandingHero);
  const [landingSubtitle, setLandingSubtitle] = useState(initialLandingSubtitle);
  const [termsBody, setTermsBody] = useState(initialTermsBody);
  const [privacyBody, setPrivacyBody] = useState(initialPrivacyBody);
  const [refundBody, setRefundBody] = useState(initialRefundBody);
  const [faqBody, setFaqBody] = useState(initialFaqBody);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnMessage, setNewAnnMessage] = useState("");
  const [newAnnLink, setNewAnnLink] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementSegment, setAnnouncementSegment] = useState("ALL");
  const [announcementChannels, setAnnouncementChannels] = useState<Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM">>(["IN_APP"]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function toggleAnnouncementChannel(channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM") {
    setAnnouncementChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    );
  }

  function resetAnnouncementForm() {
    setEditingAnnouncementId(null);
    setNewAnnTitle("");
    setNewAnnMessage("");
    setNewAnnLink("");
    setAnnouncementSegment("ALL");
    setAnnouncementChannels(["IN_APP"]);
  }

  async function saveContent(key: string, value: unknown) {
    setLoading(key);
    setMessage("");
    const res = await fetch("/api/admin/cms/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key, value }),
    });
    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  async function toggleFlag(flag: FeatureFlag) {
    setLoading(`flag:${flag.key}`);
    setMessage("");
    const res = await fetch("/api/admin/cms/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key: flag.key, enabled: !flag.enabled, description: flag.description }),
    });
    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  async function createAnnouncement() {
    setLoading("announcement:create");
    setMessage("");
    const res = await fetch("/api/admin/cms/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: newAnnTitle,
        message: newAnnMessage,
        link: newAnnLink,
        isActive: true,
        segment: announcementSegment,
        channels: announcementChannels,
      }),
    });
    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      resetAnnouncementForm();
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  async function saveAnnouncementEdits() {
    if (!editingAnnouncementId) return;

    setLoading(`announcement:edit:${editingAnnouncementId}`);
    setMessage("");
    const res = await fetch("/api/admin/cms/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: editingAnnouncementId,
        title: newAnnTitle,
        message: newAnnMessage,
        link: newAnnLink,
      }),
    });
    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      resetAnnouncementForm();
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  async function toggleAnnouncement(item: Announcement) {
    setLoading(`announcement:${item.id}`);
    setMessage("");
    const res = await fetch("/api/admin/cms/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  function startAnnouncementEdit(item: Announcement) {
    setEditingAnnouncementId(item.id);
    setNewAnnTitle(item.title);
    setNewAnnMessage(item.message);
    setNewAnnLink(item.link || "");
  }

  async function deleteAnnouncement(item: Announcement) {
    setLoading(`announcement:delete:${item.id}`);
    setMessage("");
    const res = await fetch("/api/admin/cms/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: item.id }),
    });
    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = { error: "Unexpected server response" };
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated");
    if (res.ok) {
      if (editingAnnouncementId === item.id) {
        resetAnnouncementForm();
      }
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Landing Editor</h3>
        <Input value={landingHero} onChange={(e) => setLandingHero(e.target.value)} placeholder="Hero title" />
        <textarea
          value={landingSubtitle}
          onChange={(e) => setLandingSubtitle(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Hero subtitle"
        />
        <Button onClick={() => saveContent("landing.home", { heroTitle: landingHero, heroSubtitle: landingSubtitle })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "landing.home" ? "Saving..." : "Save Landing Content"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">FAQ & Legal Editor</h3>
        <textarea value={termsBody} onChange={(e) => setTermsBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Terms body" />
        <Button onClick={() => saveContent("legal.terms", { body: termsBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.terms" ? "Saving..." : "Save Terms"}
        </Button>
        <textarea value={privacyBody} onChange={(e) => setPrivacyBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Privacy body" />
        <Button onClick={() => saveContent("legal.privacy", { body: privacyBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.privacy" ? "Saving..." : "Save Privacy"}
        </Button>
        <textarea value={refundBody} onChange={(e) => setRefundBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Refund policy body" />
        <Button onClick={() => saveContent("legal.refund", { body: refundBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.refund" ? "Saving..." : "Save Refund Policy"}
        </Button>
        <textarea value={faqBody} onChange={(e) => setFaqBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="FAQ body" />
        <Button onClick={() => saveContent("legal.faq", { body: faqBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.faq" ? "Saving..." : "Save FAQ"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Feature Flags</h3>
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.key} className="flex flex-col gap-3 rounded-md border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="break-all text-sm font-medium">{flag.key}</p>
                <p className="text-xs text-white/60">{flag.description || "No description"}</p>
              </div>
              <Button onClick={() => toggleFlag(flag)} disabled={loading !== null} variant="outline" className="w-full sm:w-auto">
                {flag.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Banners & Announcements</h3>
        {editingAnnouncementId ? (
          <p className="text-xs text-emerald-300/80">
            Editing selected announcement. Save changes or cancel to return to create mode.
          </p>
        ) : null}
        <Input value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} placeholder="Announcement title" />
        <textarea
          value={newAnnMessage}
          onChange={(e) => setNewAnnMessage(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Announcement message"
        />
        <Input value={newAnnLink} onChange={(e) => setNewAnnLink(e.target.value)} placeholder="Optional link" />
        <select
          value={announcementSegment}
          onChange={(e) => setAnnouncementSegment(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
        >
          <option value="ALL">Broadcast to all users</option>
          <option value="USER">Users only</option>
          <option value="BUSINESS">Businesses only</option>
          <option value="MANAGER">Managers only</option>
          <option value="ADMIN">Admins only</option>
        </select>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {([
            ["IN_APP", "In-app platform notice"],
            ["EMAIL", "Send to Gmail/email inbox"],
            ["SMS", "Send to mobile numbers"],
            ["PUSH", "Send to device push tokens"],
            ["TELEGRAM", "Send to linked Telegram chats"],
          ] as const).map(([channel, label]) => (
            <label
              key={channel}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/80"
            >
              <input
                type="checkbox"
                checked={announcementChannels.includes(channel)}
                onChange={() => toggleAnnouncementChannel(channel)}
                className="h-4 w-4"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-white/55">
          Email uses SMTP. Mobile delivery uses the SMS webhook. Push uses Firebase. Telegram uses the bot link flow.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={editingAnnouncementId ? saveAnnouncementEdits : createAnnouncement}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === "announcement:create" || loading === `announcement:edit:${editingAnnouncementId}`
              ? "Saving..."
              : editingAnnouncementId
                ? "Save Changes"
                : "Create Announcement"}
          </Button>
          {editingAnnouncementId ? (
            <Button
              type="button"
              variant="outline"
              onClick={resetAnnouncementForm}
              disabled={loading !== null}
              className="w-full sm:w-auto"
            >
              Cancel Edit
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          {announcements.map((item) => (
            <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-white/70">{item.message}</p>
              {item.link ? <p className="break-all text-xs text-white/50">{item.link}</p> : null}
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => startAnnouncementEdit(item)}
                  disabled={loading !== null}
                  className="w-full sm:w-auto"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleAnnouncement(item)}
                  disabled={loading !== null}
                  className="w-full sm:w-auto"
                >
                  {item.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteAnnouncement(item)}
                  disabled={loading !== null}
                  className="w-full sm:w-auto"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
