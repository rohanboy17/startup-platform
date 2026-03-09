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
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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
      setNewAnnTitle("");
      setNewAnnMessage("");
      setNewAnnLink("");
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

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold">Landing Editor</h3>
        <Input value={landingHero} onChange={(e) => setLandingHero(e.target.value)} placeholder="Hero title" />
        <textarea
          value={landingSubtitle}
          onChange={(e) => setLandingSubtitle(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Hero subtitle"
        />
        <Button onClick={() => saveContent("landing.home", { heroTitle: landingHero, heroSubtitle: landingSubtitle })} disabled={loading !== null}>
          {loading === "landing.home" ? "Saving..." : "Save Landing Content"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold">FAQ & Legal Editor</h3>
        <textarea value={termsBody} onChange={(e) => setTermsBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Terms body" />
        <Button onClick={() => saveContent("legal.terms", { body: termsBody })} disabled={loading !== null}>
          {loading === "legal.terms" ? "Saving..." : "Save Terms"}
        </Button>
        <textarea value={privacyBody} onChange={(e) => setPrivacyBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Privacy body" />
        <Button onClick={() => saveContent("legal.privacy", { body: privacyBody })} disabled={loading !== null}>
          {loading === "legal.privacy" ? "Saving..." : "Save Privacy"}
        </Button>
        <textarea value={refundBody} onChange={(e) => setRefundBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Refund policy body" />
        <Button onClick={() => saveContent("legal.refund", { body: refundBody })} disabled={loading !== null}>
          {loading === "legal.refund" ? "Saving..." : "Save Refund Policy"}
        </Button>
        <textarea value={faqBody} onChange={(e) => setFaqBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white" placeholder="FAQ body" />
        <Button onClick={() => saveContent("legal.faq", { body: faqBody })} disabled={loading !== null}>
          {loading === "legal.faq" ? "Saving..." : "Save FAQ"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold">Feature Flags</h3>
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-3">
              <div>
                <p className="text-sm font-medium">{flag.key}</p>
                <p className="text-xs text-white/60">{flag.description || "No description"}</p>
              </div>
              <Button onClick={() => toggleFlag(flag)} disabled={loading !== null} variant="outline">
                {flag.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold">Banners & Announcements</h3>
        <Input value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} placeholder="Announcement title" />
        <textarea
          value={newAnnMessage}
          onChange={(e) => setNewAnnMessage(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Announcement message"
        />
        <Input value={newAnnLink} onChange={(e) => setNewAnnLink(e.target.value)} placeholder="Optional link" />
        <Button onClick={createAnnouncement} disabled={loading !== null}>
          {loading === "announcement:create" ? "Saving..." : "Create Announcement"}
        </Button>

        <div className="space-y-2">
          {announcements.map((item) => (
            <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-white/70">{item.message}</p>
              {item.link ? <p className="text-xs text-white/50">{item.link}</p> : null}
              <div className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => toggleAnnouncement(item)}
                  disabled={loading !== null}
                >
                  {item.isActive ? "Deactivate" : "Activate"}
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

