"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/lib/format-money";
import {
  DEFAULT_JOB_CATEGORIES,
  getEffectiveJobTypeLabel,
  getJobTypesForCategory,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  JOB_WORK_MODE_OPTIONS,
} from "@/lib/job-categories";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { getJobBudgetRequired } from "@/lib/jobs";

function normalizeChip(value: string, max = 48) {
  return value.trim().slice(0, max);
}

export default function BusinessJobForm() {
  const t = useTranslations("business.jobForm");
  const router = useRouter();
  const defaultCategory = DEFAULT_JOB_CATEGORIES[0]?.name || "Other";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobCategory, setJobCategory] = useState(defaultCategory);
  const [jobType, setJobType] = useState(getJobTypesForCategory(defaultCategory)[0] || "Other");
  const [customJobType, setCustomJobType] = useState("");
  const [workMode, setWorkMode] = useState("WORK_IN_FIELD");
  const [employmentType, setEmploymentType] = useState("DAILY_GIG");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [hiringRadiusKm, setHiringRadiusKm] = useState("");
  const [openings, setOpenings] = useState("1");
  const [payAmount, setPayAmount] = useState("");
  const [payUnit, setPayUnit] = useState("DAILY");
  const [shiftSummary, setShiftSummary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [minEducation, setMinEducation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const jobTypes = useMemo(() => getJobTypesForCategory(jobCategory), [jobCategory]);
  const needsCustomType = jobType === "Other";
  const effectiveTypeLabel = getEffectiveJobTypeLabel(jobType, customJobType);
  const numericOpenings = Number(openings) > 0 ? Number(openings) : 0;
  const numericPayAmount = Number(payAmount) > 0 ? Number(payAmount) : 0;
  const payout = getPhysicalWorkPayoutBreakdown(numericPayAmount);
  const budgetRequired = getJobBudgetRequired(numericPayAmount, numericOpenings);

  function addChip(
    value: string,
    current: string[],
    setCurrent: Dispatch<SetStateAction<string[]>>,
    maxItems: number
  ) {
    const next = normalizeChip(value);
    if (!next) return false;
    if (current.some((item) => item.toLowerCase() === next.toLowerCase())) return false;
    if (current.length >= maxItems) return false;
    setCurrent([...current, next]);
    return true;
  }

  async function submit() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/v2/business/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title,
        description,
        jobCategory,
        jobType,
        customJobType: needsCustomType ? customJobType : null,
        workMode,
        employmentType,
        city,
        state,
        pincode,
        addressLine,
        latitude: latitude || null,
        longitude: longitude || null,
        hiringRadiusKm: hiringRadiusKm || null,
        openings: Number(openings),
        payAmount: Number(payAmount),
        payUnit,
        shiftSummary,
        startDate: startDate || null,
        applicationDeadline: applicationDeadline || null,
        requiredSkills,
        requiredLanguages,
        minEducation,
      }),
    });

    const raw = await res.text();
    let parsed: { error?: string; job?: { id: string } } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: t("errors.unexpectedServerResponse") };
    }

    setSaving(false);

    if (!res.ok) {
      setError(parsed.error || t("errors.failedToCreate"));
      return;
    }

    if (parsed.job?.id) {
      router.push(`/dashboard/business/jobs/${parsed.job.id}`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <SectionCard className="border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200">
          {error}
        </SectionCard>
      ) : null}

      <SectionCard elevated className="space-y-5 p-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("eyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">{t("title")}</h3>
          <p className="mt-1 text-sm text-foreground/70">{t("subtitle")}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("fields.title")}
            className="min-h-11"
          />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("fields.city")}
            className="min-h-11"
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("fields.description")}
          className="min-h-[130px] w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={jobCategory}
            onChange={(e) => {
              const next = e.target.value;
              setJobCategory(next);
              setJobType(getJobTypesForCategory(next)[0] || "Other");
            }}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            {DEFAULT_JOB_CATEGORIES.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {needsCustomType ? (
          <Input
            value={customJobType}
            onChange={(e) => setCustomJobType(e.target.value)}
            placeholder={t("fields.customJobType")}
            className="min-h-11"
          />
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            {JOB_WORK_MODE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`workModes.${item.value}`)}
              </option>
            ))}
          </select>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            {JOB_EMPLOYMENT_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`employmentTypes.${item.value}`)}
              </option>
            ))}
          </select>
          <Input
            value={openings}
            onChange={(e) => setOpenings(e.target.value)}
            type="number"
            min={1}
            placeholder={t("fields.openings")}
            className="min-h-11"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder={t("fields.state")}
            className="min-h-11"
          />
          <Input
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder={t("fields.pincode")}
            className="min-h-11"
          />
          <Input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder={t("fields.addressLine")}
            className="min-h-11"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder={t("fields.latitude")}
            className="min-h-11"
          />
          <Input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder={t("fields.longitude")}
            className="min-h-11"
          />
          <Input
            value={hiringRadiusKm}
            onChange={(e) => setHiringRadiusKm(e.target.value)}
            type="number"
            min={1}
            placeholder={t("fields.hiringRadiusKm")}
            className="min-h-11"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            type="number"
            min={1}
            step="0.01"
            placeholder={t("fields.payAmount")}
            className="min-h-11"
          />
          <select
            value={payUnit}
            onChange={(e) => setPayUnit(e.target.value)}
            className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
          >
            {JOB_PAY_UNIT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`payUnits.${item.value}`)}
              </option>
            ))}
          </select>
          <Input
            value={shiftSummary}
            onChange={(e) => setShiftSummary(e.target.value)}
            placeholder={t("fields.shiftSummary")}
            className="min-h-11"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{t("fields.startDate")}</p>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-11" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{t("fields.applicationDeadline")}</p>
            <Input
              type="date"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
              className="min-h-11"
            />
          </div>
        </div>

        <Input
          value={minEducation}
          onChange={(e) => setMinEducation(e.target.value)}
          placeholder={t("fields.minEducation")}
          className="min-h-11"
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("fields.requiredSkills")}</p>
            <p className="mt-1 text-sm text-foreground/70">{t("requiredSkillsHelp")}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder={t("fields.addSkill")}
              className="min-h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addChip(skillInput, requiredSkills, setRequiredSkills, 12)) setSkillInput("");
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (addChip(skillInput, requiredSkills, setRequiredSkills, 12)) setSkillInput("");
              }}
            >
              {t("actions.add")}
            </Button>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            {requiredSkills.length === 0 ? (
              <p className="text-sm text-foreground/70">{t("emptySkills")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRequiredSkills((current) => current.filter((entry) => entry !== item))}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs text-foreground/80"
                  >
                    <span>{item}</span>
                    <span className="text-foreground/50">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{t("fields.requiredLanguages")}</p>
            <p className="mt-1 text-sm text-foreground/70">{t("requiredLanguagesHelp")}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              placeholder={t("fields.addLanguage")}
              className="min-h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addChip(languageInput, requiredLanguages, setRequiredLanguages, 8)) setLanguageInput("");
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (addChip(languageInput, requiredLanguages, setRequiredLanguages, 8)) setLanguageInput("");
              }}
            >
              {t("actions.add")}
            </Button>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            {requiredLanguages.length === 0 ? (
              <p className="text-sm text-foreground/70">{t("emptyLanguages")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {requiredLanguages.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRequiredLanguages((current) => current.filter((entry) => entry !== item))}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs text-foreground/80"
                  >
                    <span>{item}</span>
                    <span className="text-foreground/50">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">{t("previewEyebrow")}</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t("preview.jobType")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{effectiveTypeLabel}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t("preview.workSetup")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {t(`workModes.${workMode}`)} | {t(`employmentTypes.${employmentType}`)}
            </p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t("preview.location")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{city || "-"}, {state || "-"}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t("preview.pay")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {payAmount || "-"} / {t(`payUnits.${payUnit}`)}
            </p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t("preview.workerTakeHome")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {numericPayAmount > 0 ? formatMoney(payout.workerAmount) : "-"}
            </p>
            <p className="mt-1 text-xs text-foreground/60">{t("preview.platformCut", { percent: Math.round(payout.commissionRate * 100) })}</p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t("preview.fundRequired")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {budgetRequired > 0 ? formatMoney(budgetRequired) : "-"}
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/65">{t("footerNote")}</p>
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? t("actions.posting") : t("actions.postJob")}
        </Button>
      </div>
    </div>
  );
}

