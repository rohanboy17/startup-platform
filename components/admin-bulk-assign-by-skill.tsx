"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { useLiveRefresh } from "@/lib/live-refresh";

type SkillRow = {
  id: string;
  slug: string;
  label: string;
  activeUserCount: number;
};

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  assignedUsers: number;
};

export default function AdminBulkAssignBySkill() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [excludeSuspicious, setExcludeSuspicious] = useState(true);
  const [workMode, setWorkMode] = useState("");
  const [workingPreference, setWorkingPreference] = useState("");
  const [education, setEducation] = useState("");
  const [language, setLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setMessage("");

    const [skillsRes, campaignsRes] = await Promise.all([
      fetch("/api/v2/admin/skills", { credentials: "include" }),
      fetch("/api/v2/admin/campaigns/assignable?category=work", { credentials: "include" }),
    ]);

    const [skillsRaw, campaignsRaw] = await Promise.all([skillsRes.text(), campaignsRes.text()]);
    let skillsParsed: { skills?: SkillRow[]; error?: string } = {};
    let campaignsParsed: { campaigns?: CampaignRow[]; error?: string } = {};

    try {
      skillsParsed = skillsRaw ? (JSON.parse(skillsRaw) as { skills?: SkillRow[]; error?: string }) : {};
    } catch {
      skillsParsed = { error: "Unexpected skills response" };
    }

    try {
      campaignsParsed = campaignsRaw ? (JSON.parse(campaignsRaw) as { campaigns?: CampaignRow[]; error?: string }) : {};
    } catch {
      campaignsParsed = { error: "Unexpected campaigns response" };
    }

    setLoading(false);

    if (!skillsRes.ok) {
      setError(skillsParsed.error || "Failed to load skills");
      return;
    }

    if (!campaignsRes.ok) {
      setError(campaignsParsed.error || "Failed to load campaigns");
      return;
    }

    setSkills(skillsParsed.skills || []);
    setCampaigns(campaignsParsed.campaigns || []);
  }

  useLiveRefresh(load, 120000);

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const base = q ? skills.filter((s) => s.label.toLowerCase().includes(q)) : skills.slice();
    base.sort((a, b) => (b.activeUserCount || 0) - (a.activeUserCount || 0));
    return base.slice(0, 50);
  }, [skillQuery, skills]);

  const selectedSkillRow = useMemo(
    () => skills.find((s) => s.slug === selectedSkill) || null,
    [selectedSkill, skills]
  );

  const selectedCampaignRow = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaign) || null,
    [selectedCampaign, campaigns]
  );

  async function sendRequest(dryRun: boolean) {
    if (!selectedSkill || !selectedCampaign) return;

    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/v2/admin/assignments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        campaignId: selectedCampaign,
        skillSlug: selectedSkill,
        dryRun,
        excludeSuspicious,
        workMode,
        workingPreference,
        education,
        language,
      }),
    });

    const raw = await res.text();
    let parsed: {
      error?: string;
      message?: string;
      eligible?: number;
      alreadyAssigned?: number;
      newlyAssigned?: number;
      wouldAssign?: number;
    } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }

    setSaving(false);

    if (!res.ok) {
      setError(parsed.error || (dryRun ? "Preview failed" : "Bulk assign failed"));
      return;
    }

    const line =
      `Eligible ${parsed.eligible ?? 0}. ` +
      `Would assign ${parsed.wouldAssign ?? 0}. ` +
      `Already assigned ${parsed.alreadyAssigned ?? 0}.` +
      (dryRun ? "" : ` Newly assigned ${parsed.newlyAssigned ?? 0}.`);

    setMessage(parsed.message ? `${parsed.message}. ${line}` : line);
    await load();
  }

  async function preview() {
    await sendRequest(true);
  }

  async function runBulkAssign() {
    if (!selectedSkill || !selectedCampaign) return;
    const skillLabel = selectedSkillRow?.label || selectedSkill;
    const campaignTitle = selectedCampaignRow?.title || selectedCampaign;
    const count = selectedSkillRow?.activeUserCount ?? 0;
    const filterLabel = excludeSuspicious ? "excluding suspicious users" : "including suspicious users";
    const profileFilters = [
      workMode ? `work mode: ${workMode}` : null,
      workingPreference ? `preference: ${workingPreference}` : null,
      education ? `education contains "${education}"` : null,
      language ? `language contains "${language}"` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const ok = confirm(
      `Assign campaign "${campaignTitle}" to all ACTIVE users with skill "${skillLabel}" (${filterLabel})?` +
        `${profileFilters ? `\\nProfile filters: ${profileFilters}` : ""}` +
        `\\n\\nBase eligible users for this skill: ${count}`
    );
    if (!ok) return;

    await sendRequest(false);
  }

  return (
    <SectionCard elevated className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Work campaign targeting</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Bulk assign users by skill</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Assign a work campaign to every ACTIVE user who has selected a specific skill.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-200">{message}</p> : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
        <div className="rounded-2xl border border-foreground/10 bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60">Skill</p>
          <div className="mt-2 space-y-2">
            <Input
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Search skills..."
              className="min-h-11"
            />
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="">Select a skill</option>
              {filteredSkills.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label} ({s.activeUserCount})
                </option>
              ))}
            </select>
            {selectedSkillRow ? (
              <p className="text-xs text-foreground/60">Eligible ACTIVE users: {selectedSkillRow.activeUserCount}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60">Work campaign</p>
          <div className="mt-2 space-y-2">
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
            >
              <option value="">Select a work campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} [{c.status}] (assigned {c.assignedUsers})
                </option>
              ))}
            </select>
            {selectedCampaignRow ? (
              <p className="text-xs text-foreground/60">Currently assigned: {selectedCampaignRow.assignedUsers}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-end">
          <div className="w-full space-y-2">
            <label className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-xs text-foreground/70">
              <input
                type="checkbox"
                checked={excludeSuspicious}
                onChange={(e) => setExcludeSuspicious(e.target.checked)}
              />
              Exclude suspicious users
            </label>

            <Button
              type="button"
              variant="secondary"
              onClick={preview}
              disabled={saving || loading || !selectedSkill || !selectedCampaign}
              className="w-full"
            >
              {saving ? "Working..." : "Preview"}
            </Button>

            <Button
              onClick={runBulkAssign}
              disabled={saving || loading || !selectedSkill || !selectedCampaign}
              className="w-full"
            >
              {saving ? "Assigning..." : "Assign all"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value)}
          className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
        >
          <option value="">Any work mode</option>
          <option value="WORK_FROM_HOME">Work from home</option>
          <option value="WORK_FROM_OFFICE">Work from office</option>
          <option value="WORK_IN_FIELD">Work in field</option>
        </select>

        <select
          value={workingPreference}
          onChange={(e) => setWorkingPreference(e.target.value)}
          className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/25 focus:ring-2 focus:ring-foreground/10"
        >
          <option value="">Any work preference</option>
          <option value="SALARIED">Salaried</option>
          <option value="FREELANCE_CONTRACTUAL">Freelance contractual</option>
          <option value="DAY_BASIS">Day basis</option>
        </select>

        <Input
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          placeholder="Education keyword"
          className="min-h-11"
        />

        <Input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="Language"
          className="min-h-11"
        />
      </div>
    </SectionCard>
  );
}
