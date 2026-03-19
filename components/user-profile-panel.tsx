"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { useLiveRefresh } from "@/lib/live-refresh";

type SettingsPayload = {
  profile: {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    role: string;
    createdAt: string;
    timezone: string;
    address: string | null;
    gender: string | null;
    religion: string | null;
    dateOfBirth: string | null;
    workMode: string | null;
    educationQualification: string | null;
    courseAndCertificate: string | null;
    workTime: string | null;
    workingPreference: string | null;
    languages: string[];
  };
  error?: string;
};

type SkillsResponse = {
  skills: Array<{ slug: string; label: string }>;
  error?: string;
};

function calculateAge(value: string) {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function normalizeChip(value: string, max = 40) {
  return value.trim().slice(0, max);
}

export default function UserProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [religion, setReligion] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [educationQualification, setEducationQualification] = useState("");
  const [courseAndCertificate, setCourseAndCertificate] = useState("");
  const [workTime, setWorkTime] = useState("");
  const [workingPreference, setWorkingPreference] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const load = useCallback(async () => {
    const [settingsRes, skillsRes] = await Promise.all([
      fetch("/api/v2/users/me/settings", { cache: "no-store" }),
      fetch("/api/v2/users/me/skills", { cache: "no-store" }),
    ]);

    const [settingsRaw, skillsRaw] = await Promise.all([settingsRes.text(), skillsRes.text()]);

    let settingsParsed: SettingsPayload | { error?: string } = { error: "Unexpected response" };
    let skillsParsed: SkillsResponse | { error?: string } = { skills: [] };

    try {
      settingsParsed = settingsRaw ? (JSON.parse(settingsRaw) as SettingsPayload) : settingsParsed;
    } catch {
      settingsParsed = { error: "Unexpected response" };
    }

    try {
      skillsParsed = skillsRaw ? (JSON.parse(skillsRaw) as SkillsResponse) : (skillsParsed as SkillsResponse);
    } catch {
      skillsParsed = { error: "Unexpected response" };
    }

    if (!settingsRes.ok) {
      setError((settingsParsed as { error?: string }).error || "Failed to load profile");
      setLoading(false);
      return;
    }

    if (!skillsRes.ok) {
      setError((skillsParsed as { error?: string }).error || "Failed to load skills");
      setLoading(false);
      return;
    }

    setError("");
    const settingsPayload = settingsParsed as SettingsPayload;
    const skillsPayload = skillsParsed as SkillsResponse;

    if (!initialized) {
      setEmail(settingsPayload.profile.email);
      setRole(settingsPayload.profile.role);
      setCreatedAt(new Date(settingsPayload.profile.createdAt).toLocaleString());
      setName(settingsPayload.profile.name || "");
      setMobile(settingsPayload.profile.mobile || "");
      setAddress(settingsPayload.profile.address || "");
      setGender(settingsPayload.profile.gender || "");
      setReligion(settingsPayload.profile.religion || "");
      setDateOfBirth(settingsPayload.profile.dateOfBirth || "");
      setWorkMode(settingsPayload.profile.workMode || "");
      setEducationQualification(settingsPayload.profile.educationQualification || "");
      setCourseAndCertificate(settingsPayload.profile.courseAndCertificate || "");
      setWorkTime(settingsPayload.profile.workTime || "");
      setWorkingPreference(settingsPayload.profile.workingPreference || "");
      setLanguages(settingsPayload.profile.languages || []);
      setSkills(skillsPayload.skills.map((item) => item.label));
      setInitialized(true);
    }

    setLoading(false);
  }, [initialized]);

  useLiveRefresh(load, 60000);

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  function addChip(
    value: string,
    current: string[],
    setCurrent: Dispatch<SetStateAction<string[]>>,
    maxItems: number,
    maxLength = 40
  ) {
    const next = normalizeChip(value, maxLength);
    if (!next) return false;
    const exists = current.some((item) => item.toLowerCase() === next.toLowerCase());
    if (exists || current.length >= maxItems) return false;
    setCurrent([...current, next]);
    return true;
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    setMessage("");

    const settingsRes = await fetch("/api/v2/users/me/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        profile: {
          name,
          mobile,
          address,
          gender: gender || null,
          religion,
          dateOfBirth: dateOfBirth || null,
          workMode: workMode || null,
          educationQualification,
          courseAndCertificate,
          workTime: workTime || null,
          workingPreference: workingPreference || null,
          languages,
        },
      }),
    });

    const settingsRaw = await settingsRes.text();
    let settingsParsed: { error?: string; message?: string } = {};
    try {
      settingsParsed = settingsRaw ? (JSON.parse(settingsRaw) as { error?: string; message?: string }) : {};
    } catch {
      settingsParsed = { error: "Unexpected server response" };
    }

    if (!settingsRes.ok) {
      setSaving(false);
      setError(settingsParsed.error || "Failed to save profile");
      return;
    }

    const skillsRes = await fetch("/api/v2/users/me/skills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ skills }),
    });

    const skillsRaw = await skillsRes.text();
    let skillsParsed: { error?: string; message?: string } = {};
    try {
      skillsParsed = skillsRaw ? (JSON.parse(skillsRaw) as { error?: string; message?: string }) : {};
    } catch {
      skillsParsed = { error: "Unexpected server response" };
    }

    setSaving(false);

    if (!skillsRes.ok) {
      setError(skillsParsed.error || "Failed to save skills");
      return;
    }

    setMessage("Profile updated");
    await load();
  }

  if (loading) {
    return <SectionCard className="text-sm text-foreground/70">Loading profile...</SectionCard>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <SectionCard className="border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200">
          {error}
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Basic profile</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Personal details</h3>
            <p className="mt-1 text-sm text-foreground/70">
              Keep your profile complete so admins can match you with the right work-based campaigns.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
            <Input
              placeholder="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="min-h-11"
            />
          </div>

          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className="min-h-[110px] w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
            <Input
              placeholder="Religion"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="min-h-11"
            />
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground/70">
              Age: <span className="font-semibold text-foreground">{age ?? "-"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="break-all">
              <span className="text-foreground/50">Email:</span> {email}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">Role:</span> {role}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">Created:</span> {createdAt}
            </p>
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Work profile</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Availability and preferences</h3>
            <p className="mt-1 text-sm text-foreground/70">
              These details help the admin side understand what kind of work you can take.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
            >
              <option value="">Work mode</option>
              <option value="WORK_FROM_HOME">Work from home</option>
              <option value="WORK_FROM_OFFICE">Work from office</option>
              <option value="WORK_IN_FIELD">Work in field</option>
            </select>
            <select
              value={workTime}
              onChange={(e) => setWorkTime(e.target.value)}
              className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
            >
              <option value="">Work time</option>
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
            </select>
          </div>

          <select
            value={workingPreference}
            onChange={(e) => setWorkingPreference(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            <option value="">Working preference</option>
            <option value="SALARIED">Salaried</option>
            <option value="FREELANCE_CONTRACTUAL">Freelance Contractual</option>
            <option value="DAY_BASIS">Day Basis</option>
          </select>

          <Input
            placeholder="Education qualification"
            value={educationQualification}
            onChange={(e) => setEducationQualification(e.target.value)}
            className="min-h-11"
          />

          <textarea
            value={courseAndCertificate}
            onChange={(e) => setCourseAndCertificate(e.target.value)}
            placeholder="Course and certificate details"
            className="min-h-[110px] w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Skills</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">What work can you do?</h3>
            <p className="mt-1 text-sm text-foreground/70">
              Add the skills you want admins to use when assigning you to work-based campaigns.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Add a skill"
              className="min-h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addChip(skillInput, skills, setSkills, 20)) {
                    setSkillInput("");
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={skills.length >= 20}
              onClick={() => {
                if (addChip(skillInput, skills, setSkills, 20)) {
                  setSkillInput("");
                }
              }}
            >
              Add
            </Button>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            {skills.length === 0 ? (
              <p className="text-sm text-foreground/70">No skills yet. Add 3 to 6 to get started.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setSkills((current) => current.filter((item) => item !== skill))}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.06]"
                  >
                    <span>{skill}</span>
                    <span className="text-foreground/50">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">Languages</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Languages you can work in</h3>
            <p className="mt-1 text-sm text-foreground/70">
              Add the languages you can speak or work with comfortably.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              placeholder="Add a language"
              className="min-h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addChip(languageInput, languages, setLanguages, 10)) {
                    setLanguageInput("");
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={languages.length >= 10}
              onClick={() => {
                if (addChip(languageInput, languages, setLanguages, 10)) {
                  setLanguageInput("");
                }
              }}
            >
              Add
            </Button>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            {languages.length === 0 ? (
              <p className="text-sm text-foreground/70">No languages added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {languages.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => setLanguages((current) => current.filter((item) => item !== language))}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs text-foreground/80 transition hover:bg-foreground/[0.06]"
                  >
                    <span>{language}</span>
                    <span className="text-foreground/50">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save profile"}
        </Button>
        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </div>
    </div>
  );
}
