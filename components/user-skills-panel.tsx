"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { useLiveRefresh } from "@/lib/live-refresh";

type SkillsResponse = {
  skills: Array<{ slug: string; label: string }>;
  error?: string;
};

export default function UserSkillsPanel() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/skills", { cache: "no-store" });
    const raw = await res.text();
    let parsed: SkillsResponse | { error?: string } = { skills: [] };
    try {
      parsed = raw ? (JSON.parse(raw) as SkillsResponse) : (parsed as SkillsResponse);
    } catch {
      parsed = { error: "Unexpected response" };
    }

    setLoading(false);

    if (!res.ok) {
      setError((parsed as { error?: string }).error || "Failed to load skills");
      return;
    }

    setError("");
    const payload = parsed as SkillsResponse;
    if (!dirty) {
      setSkills(payload.skills.map((s) => s.label));
    }
  }, [dirty]);

  useLiveRefresh(load, 60000);

  function addSkill(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const normalized = trimmed.slice(0, 40);
    setSkills((current) => {
      const exists = current.some((s) => s.toLowerCase() === normalized.toLowerCase());
      if (exists) return current;
      if (current.length >= 20) return current;
      return [...current, normalized];
    });
    setDirty(true);
  }

  function removeSkill(label: string) {
    setSkills((current) => current.filter((s) => s !== label));
    setDirty(true);
  }

  async function saveSkills() {
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/v2/users/me/skills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ skills }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }

    setSaving(false);

    if (!res.ok) {
      setError(parsed.error || "Failed to save skills");
      return;
    }

    setDirty(false);
    setMessage(parsed.message || "Skills updated");
    await load();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <SectionCard className="border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200">
          {error}
        </SectionCard>
      ) : null}

      <SectionCard elevated className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Skills</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">What work can you do?</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Add a few skills so admins can match you to invite-only work campaigns. (Max 20)
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="Add a skill (e.g., Data entry, Research, Writing)"
            className="min-h-11"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill(skillInput);
                setSkillInput("");
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              addSkill(skillInput);
              setSkillInput("");
            }}
            disabled={skills.length >= 20}
            className="w-full sm:w-auto"
          >
            Add
          </Button>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
          {loading ? (
            <p className="text-sm text-foreground/70">Loading skills...</p>
          ) : skills.length === 0 ? (
            <p className="text-sm text-foreground/70">No skills yet. Add 3 to 6 to get started.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.06]"
                  title="Remove"
                >
                  <span>{skill}</span>
                  <span className="text-foreground/50">x</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={saveSkills} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save skills"}
          </Button>
          {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
