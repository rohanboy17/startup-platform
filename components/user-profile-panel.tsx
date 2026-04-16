"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Camera, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveRefresh } from "@/lib/live-refresh";
import {
  INTERNSHIP_PREFERENCE_OPTIONS,
  PROFILE_WORK_CATEGORY_OPTIONS,
  PROFILE_WORK_MODE_OPTIONS,
  type TaxonomySelectOption,
  WORK_TIME_OPTIONS,
  WORKING_PREFERENCE_OPTIONS,
} from "@/lib/work-taxonomy";

type ProfileWorkCategoryOption = {
  value: string;
  label: string;
  description?: string;
};

type SelectOption = TaxonomySelectOption;

type SettingsPayload = {
  profile: {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    role: string;
    createdAt: string;
    timezone: string;
    avatarUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    gender: string | null;
    religion: string | null;
    dateOfBirth: string | null;
    workMode: string | null;
    educationQualification: string | null;
    courseAndCertificate: string | null;
    workTime: string | null;
    workingPreference: string | null;
    internshipPreference: string | null;
    preferredWorkCategories: string[];
    languages: string[];
  };
  experience?: {
    totalWorkDays: number;
    digitalWorkDays: number;
    physicalWorkDays: number;
    approvedTaskCount: number;
    joinedJobsCount: number;
    activeSince: string | null;
    experienceLabel: string;
  } | null;
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
  const t = useTranslations("user.profile");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gender, setGender] = useState("");
  const [religion, setReligion] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [educationQualification, setEducationQualification] = useState("");
  const [courseAndCertificate, setCourseAndCertificate] = useState("");
  const [workTime, setWorkTime] = useState("");
  const [workingPreference, setWorkingPreference] = useState("");
  const [internshipPreference, setInternshipPreference] = useState("");
  const [profileWorkModes, setProfileWorkModes] = useState<SelectOption[]>(PROFILE_WORK_MODE_OPTIONS);
  const [workTimeOptions, setWorkTimeOptions] = useState<SelectOption[]>(WORK_TIME_OPTIONS);
  const [workingPreferenceOptions, setWorkingPreferenceOptions] = useState<SelectOption[]>(
    WORKING_PREFERENCE_OPTIONS
  );
  const [internshipPreferenceOptions, setInternshipPreferenceOptions] = useState<SelectOption[]>(
    INTERNSHIP_PREFERENCE_OPTIONS
  );
  const [preferredWorkCategories, setPreferredWorkCategories] = useState<string[]>([]);
  const [profileWorkCategories, setProfileWorkCategories] = useState<ProfileWorkCategoryOption[]>(
    PROFILE_WORK_CATEGORY_OPTIONS
  );
  const [experience, setExperience] = useState<SettingsPayload["experience"]>(null);
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

    let settingsParsed: SettingsPayload | { error?: string } = { error: t("errors.unexpectedResponse") };
    let skillsParsed: SkillsResponse | { error?: string } = { skills: [] };

    try {
      settingsParsed = settingsRaw ? (JSON.parse(settingsRaw) as SettingsPayload) : settingsParsed;
    } catch {
      settingsParsed = { error: t("errors.unexpectedResponse") };
    }

    try {
      skillsParsed = skillsRaw ? (JSON.parse(skillsRaw) as SkillsResponse) : (skillsParsed as SkillsResponse);
    } catch {
      skillsParsed = { error: t("errors.unexpectedResponse") };
    }

    if (!settingsRes.ok) {
      setError((settingsParsed as { error?: string }).error || t("errors.failedToLoadProfile"));
      setLoading(false);
      return;
    }

    if (!skillsRes.ok) {
      setError((skillsParsed as { error?: string }).error || t("errors.failedToLoadSkills"));
      setLoading(false);
      return;
    }

    setError("");
    const settingsPayload = settingsParsed as SettingsPayload;
    const skillsPayload = skillsParsed as SkillsResponse;
    setExperience(settingsPayload.experience || null);

    if (!initialized) {
      setEmail(settingsPayload.profile.email);
      setRole(settingsPayload.profile.role);
      setCreatedAt(new Date(settingsPayload.profile.createdAt).toLocaleString(locale));
      setAvatarUrl(settingsPayload.profile.avatarUrl || "");
      setName(settingsPayload.profile.name || "");
      setMobile(settingsPayload.profile.mobile || "");
      setAddress(settingsPayload.profile.address || "");
      setCity(settingsPayload.profile.city || "");
      setState(settingsPayload.profile.state || "");
      setPincode(settingsPayload.profile.pincode || "");
      setLatitude(settingsPayload.profile.latitude?.toString() || "");
      setLongitude(settingsPayload.profile.longitude?.toString() || "");
      setGender(settingsPayload.profile.gender || "");
      setReligion(settingsPayload.profile.religion || "");
      setDateOfBirth(settingsPayload.profile.dateOfBirth || "");
      setWorkMode(settingsPayload.profile.workMode || "");
      setEducationQualification(settingsPayload.profile.educationQualification || "");
      setCourseAndCertificate(settingsPayload.profile.courseAndCertificate || "");
      setWorkTime(settingsPayload.profile.workTime || "");
      setWorkingPreference(settingsPayload.profile.workingPreference || "");
      setInternshipPreference(settingsPayload.profile.internshipPreference || "");
      setPreferredWorkCategories(settingsPayload.profile.preferredWorkCategories || []);
      setLanguages(settingsPayload.profile.languages || []);
      setSkills(skillsPayload.skills.map((item) => item.label));
      setInitialized(true);
    }

    setLoading(false);
  }, [initialized, locale, t]);

  useLiveRefresh(load, 60000);

  useEffect(() => {
    let active = true;
    async function loadWorkTaxonomy() {
      const res = await fetch("/api/work-taxonomy", { cache: "no-store" });
      const raw = await res.text();
      if (!active) return;
      try {
        const parsed = raw
          ? (JSON.parse(raw) as {
              profileWorkCategories?: ProfileWorkCategoryOption[];
              profileWorkModes?: SelectOption[];
              workTimeOptions?: SelectOption[];
              workingPreferenceOptions?: SelectOption[];
              internshipPreferenceOptions?: SelectOption[];
            })
          : {};
        if (parsed.profileWorkCategories?.length) {
          setProfileWorkCategories(parsed.profileWorkCategories);
        }
        if (parsed.profileWorkModes?.length) {
          setProfileWorkModes(parsed.profileWorkModes);
        }
        if (parsed.workTimeOptions?.length) {
          setWorkTimeOptions(parsed.workTimeOptions);
        }
        if (parsed.workingPreferenceOptions?.length) {
          setWorkingPreferenceOptions(parsed.workingPreferenceOptions);
        }
        if (parsed.internshipPreferenceOptions?.length) {
          setInternshipPreferenceOptions(parsed.internshipPreferenceOptions);
        }
      } catch {
        // keep empty fallback
      }
    }
    void loadWorkTaxonomy();
    return () => {
      active = false;
    };
  }, []);

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

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const payload = (await res.json().catch(() => null)) as { error?: string; url?: string } | null;
    setUploadingAvatar(false);

    if (!res.ok || !payload?.url) {
      setError(payload?.error || t("errors.failedToUploadAvatar"));
      return;
    }

    setAvatarUrl(payload.url);
    setMessage(t("avatarUploaded"));
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
          avatarUrl,
          address,
          city,
          state,
          pincode,
          latitude: latitude || null,
          longitude: longitude || null,
          gender: gender || null,
          religion,
          dateOfBirth: dateOfBirth || null,
          workMode: workMode || null,
          educationQualification,
          courseAndCertificate,
          workTime: workTime || null,
          workingPreference: workingPreference || null,
          internshipPreference: internshipPreference || null,
          preferredWorkCategories,
          languages,
        },
      }),
    });

    const settingsRaw = await settingsRes.text();
    let settingsParsed: { error?: string; message?: string } = {};
    try {
      settingsParsed = settingsRaw ? (JSON.parse(settingsRaw) as { error?: string; message?: string }) : {};
    } catch {
      settingsParsed = { error: t("errors.unexpectedServerResponse") };
    }

    if (!settingsRes.ok) {
      setSaving(false);
      setError(settingsParsed.error || t("errors.failedToSaveProfile"));
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
      skillsParsed = { error: t("errors.unexpectedServerResponse") };
    }

    setSaving(false);

    if (!skillsRes.ok) {
      setError(skillsParsed.error || t("errors.failedToSaveSkills"));
      return;
    }

    setMessage(t("profileUpdated"));
    await load();
  }

  if (loading) {
    return <SectionCard className="text-sm text-foreground/70">{t("loading")}</SectionCard>;
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("basicEyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("basicTitle")}</h3>
            <p className="mt-1 text-sm text-foreground/70">
              {t("basicSubtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-[1.6rem] border border-foreground/10 bg-gradient-to-br from-foreground/[0.05] via-background/80 to-foreground/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-[1.35rem] bg-gradient-to-br from-emerald-400/18 via-sky-400/12 to-transparent p-[3px] shadow-[0_18px_38px_-30px_rgba(15,23,42,0.35)]">
                <Avatar size="lg" className="size-[4.5rem] border border-background/90 bg-background">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name || email} /> : null}
                  <AvatarFallback className="bg-foreground/[0.08] text-base font-semibold text-foreground">
                    {(name || email || "U").trim().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t("photoTitle")}</p>
                <p className="mt-1 text-xs text-foreground/65">{t("photoSubtitle")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const next = e.target.files?.[0];
                  if (next) {
                    void uploadAvatar(next);
                  }
                  e.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 gap-2"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingAvatar ? <Upload size={16} /> : <Camera size={16} />}
                {uploadingAvatar ? t("uploadingAvatar") : t("uploadAvatar")}
              </Button>
              {avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 gap-2"
                  onClick={() => setAvatarUrl("")}
                >
                  <X size={16} />
                  {t("removeAvatar")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={t("placeholders.name")} value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
            <Input
              placeholder={t("placeholders.mobile")}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="min-h-11"
            />
          </div>

          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("placeholders.address")}
            className="min-h-[110px] w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
          />

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder={t("placeholders.city")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="min-h-11"
            />
            <Input
              placeholder={t("placeholders.state")}
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="min-h-11"
            />
            <Input
              placeholder={t("placeholders.pincode")}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder={t("placeholders.latitude")}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="min-h-11"
            />
            <Input
              placeholder={t("placeholders.longitude")}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
            >
              <option value="">{t("placeholders.selectGender")}</option>
              <option value="MALE">{t("genderOptions.MALE")}</option>
              <option value="FEMALE">{t("genderOptions.FEMALE")}</option>
              <option value="OTHER">{t("genderOptions.OTHER")}</option>
              <option value="PREFER_NOT_TO_SAY">{t("genderOptions.PREFER_NOT_TO_SAY")}</option>
            </select>
            <Input
              placeholder={t("placeholders.religion")}
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
              {t("labels.age")}: <span className="font-semibold text-foreground">{age ?? "-"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="break-all">
              <span className="text-foreground/50">{t("labels.email")}:</span> {email}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">{t("labels.role")}:</span> {role}
            </p>
            <p className="mt-2">
              <span className="text-foreground/50">{t("labels.created")}:</span> {createdAt}
            </p>
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("workProfileEyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("workProfileTitle")}</h3>
            <p className="mt-1 text-sm text-foreground/70">
              {t("workProfileSubtitle")}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
            >
              <option value="">{t("workModeOptions.default")}</option>
              {profileWorkModes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={workTime}
              onChange={(e) => setWorkTime(e.target.value)}
              className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
            >
              <option value="">{t("workTimeOptions.default")}</option>
              {workTimeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={workingPreference}
            onChange={(e) => setWorkingPreference(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            <option value="">{t("workingPreferenceOptions.default")}</option>
            {workingPreferenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={internshipPreference}
            onChange={(e) => setInternshipPreference(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            <option value="">{t("internshipPreferenceOptions.default")}</option>
            {internshipPreferenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("preferredCategoriesTitle")}</p>
              <p className="mt-1 text-sm text-foreground/70">{t("preferredCategoriesSubtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileWorkCategories.map((option) => {
                const active = preferredWorkCategories.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setPreferredWorkCategories((current) =>
                        active
                          ? current.filter((item) => item !== option.value)
                          : current.length >= 8
                            ? current
                            : [...current, option.value]
                      )
                    }
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200"
                        : "border-foreground/10 bg-background/70 text-foreground/75 hover:bg-foreground/[0.05]"
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-foreground/60">
              {t("preferredCategoriesCount", { count: preferredWorkCategories.length })}
            </p>
          </div>

          <Input
            placeholder={t("placeholders.educationQualification")}
            value={educationQualification}
            onChange={(e) => setEducationQualification(e.target.value)}
            className="min-h-11"
          />

          <textarea
            value={courseAndCertificate}
            onChange={(e) => setCourseAndCertificate(e.target.value)}
            placeholder={t("placeholders.courseAndCertificate")}
            className="min-h-[110px] w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard elevated className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("labels.skills")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("skillsTitle")}</h3>
            <p className="mt-1 text-sm text-foreground/70">
              {t("skillsSubtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder={t("placeholders.addSkill")}
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
              {t("add")}
            </Button>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            {skills.length === 0 ? (
              <p className="text-sm text-foreground/70">{t("emptySkills")}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("labels.languages")}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("languagesTitle")}</h3>
            <p className="mt-1 text-sm text-foreground/70">
              {t("languagesSubtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              placeholder={t("placeholders.addLanguage")}
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
              {t("add")}
            </Button>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            {languages.length === 0 ? (
              <p className="text-sm text-foreground/70">{t("emptyLanguages")}</p>
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

      <SectionCard elevated className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("experienceEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("experienceTitle")}</h3>
          <p className="mt-1 text-sm text-foreground/70">{t("experienceSubtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("experienceCards.totalDays")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{experience?.totalWorkDays ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("experienceCards.digitalDays")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{experience?.digitalWorkDays ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("experienceCards.physicalDays")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{experience?.physicalWorkDays ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("experienceCards.joinedJobs")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{experience?.joinedJobsCount ?? 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
          {t("experienceSummary", {
            label: experience?.experienceLabel || t("experienceNoData"),
            tasks: experience?.approvedTaskCount ?? 0,
          })}
        </div>
      </SectionCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
          {saving ? t("saving") : t("saveProfile")}
        </Button>
        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </div>
    </div>
  );
}
