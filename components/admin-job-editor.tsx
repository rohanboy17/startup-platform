"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/lib/format-money";
import {
  DEFAULT_JOB_CATEGORIES,
  type JobCategoryOption,
  getJobTypesForCategory,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  JOB_WORK_MODE_OPTIONS,
} from "@/lib/job-categories";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { getJobBudgetRequired } from "@/lib/jobs";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import type { TaxonomySelectOption } from "@/lib/work-taxonomy";

type JobShape = {
  title: string;
  description: string;
  jobCategory: string;
  jobCategorySlug?: string | null;
  jobType: string;
  jobTypeSlug?: string | null;
  customJobType: string | null;
  workMode: string;
  employmentType: string;
  city: string;
  state: string;
  pincode: string | null;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  hiringRadiusKm: number | null;
  openings: number;
  payAmount: number;
  payUnit: string;
  shiftSummary: string | null;
  startDate: string | null;
  applicationDeadline: string | null;
  requiredSkills: string[];
  requiredLanguages: string[];
  minEducation: string | null;
};

function normalizeChip(value: string, max = 48) {
  return value.trim().slice(0, max);
}

export default function AdminJobEditor({
  jobId,
  initialJob,
  onSaved,
}: {
  jobId: string;
  initialJob: JobShape;
  onSaved?: () => void;
}) {
  const tForm = useTranslations("business.jobForm");
  const tAdmin = useTranslations("admin.jobsPage");
  const router = useRouter();
  const initialSelectionRef = useRef({
    jobCategory: initialJob.jobCategory,
    jobCategorySlug: initialJob.jobCategorySlug || null,
    jobType: initialJob.jobType,
    jobTypeSlug: initialJob.jobTypeSlug || null,
  });

  const [title, setTitle] = useState(initialJob.title);
  const [jobCategories, setJobCategories] = useState<JobCategoryOption[]>(DEFAULT_JOB_CATEGORIES);
  const [description, setDescription] = useState(initialJob.description);
  const [jobCategory, setJobCategory] = useState(initialJob.jobCategory);
  const [jobType, setJobType] = useState(initialJob.jobType);
  const [customJobType, setCustomJobType] = useState(initialJob.customJobType || "");
  const [workMode, setWorkMode] = useState(initialJob.workMode);
  const [employmentType, setEmploymentType] = useState(initialJob.employmentType);
  const [jobWorkModes, setJobWorkModes] = useState<TaxonomySelectOption[]>(JOB_WORK_MODE_OPTIONS);
  const [jobEmploymentTypeOptions, setJobEmploymentTypeOptions] = useState<TaxonomySelectOption[]>(
    JOB_EMPLOYMENT_TYPE_OPTIONS
  );
  const [city, setCity] = useState(initialJob.city);
  const [state, setState] = useState(initialJob.state);
  const [pincode, setPincode] = useState(initialJob.pincode || "");
  const [addressLine, setAddressLine] = useState(initialJob.addressLine || "");
  const [latitude, setLatitude] = useState(initialJob.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(initialJob.longitude?.toString() || "");
  const [hiringRadiusKm, setHiringRadiusKm] = useState(initialJob.hiringRadiusKm?.toString() || "");
  const [openings, setOpenings] = useState(String(initialJob.openings));
  const [payAmount, setPayAmount] = useState(String(initialJob.payAmount));
  const [payUnit, setPayUnit] = useState(initialJob.payUnit);
  const [jobPayUnitOptions, setJobPayUnitOptions] = useState<TaxonomySelectOption[]>(JOB_PAY_UNIT_OPTIONS);
  const [shiftSummary, setShiftSummary] = useState(initialJob.shiftSummary || "");
  const [startDate, setStartDate] = useState(initialJob.startDate ? initialJob.startDate.slice(0, 10) : "");
  const [applicationDeadline, setApplicationDeadline] = useState(
    initialJob.applicationDeadline ? initialJob.applicationDeadline.slice(0, 10) : ""
  );
  const [requiredSkills, setRequiredSkills] = useState<string[]>(initialJob.requiredSkills);
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>(initialJob.requiredLanguages);
  const [skillInput, setSkillInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [minEducation, setMinEducation] = useState(initialJob.minEducation || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadTaxonomy() {
      const res = await fetch("/api/work-taxonomy", { credentials: "include", cache: "no-store" });
      const raw = await res.text();
      if (!active) return;
      try {
        const data = raw
          ? (JSON.parse(raw) as {
              jobCategories?: JobCategoryOption[];
              jobWorkModes?: TaxonomySelectOption[];
              jobEmploymentTypeOptions?: TaxonomySelectOption[];
              jobPayUnitOptions?: TaxonomySelectOption[];
            })
          : {};
        if (data.jobCategories?.length) {
          const categoryBySlug = data.jobCategories.find(
            (item) => item.slug === initialSelectionRef.current.jobCategorySlug
          );
          const nextCategory = categoryBySlug?.name
            || (data.jobCategories.some((item) => item.name === initialSelectionRef.current.jobCategory)
              ? initialSelectionRef.current.jobCategory
              : data.jobCategories[0]?.name || "Other");
          const nextTypes = getJobTypesForCategory(nextCategory, data.jobCategories);
          const nextTypeBySlug = data.jobCategories
            .find((item) => item.name === nextCategory)
            ?.types.find((item) => item.slug === initialSelectionRef.current.jobTypeSlug)?.label;
          setJobCategories(data.jobCategories);
          setJobCategory(nextCategory);
          setJobType(
            nextTypeBySlug
              || (nextTypes.includes(initialSelectionRef.current.jobType)
              ? initialSelectionRef.current.jobType
              : nextTypes[0] || "Other"
            )
          );
        }
        if (data.jobWorkModes?.length) {
          setJobWorkModes(data.jobWorkModes);
          setWorkMode((current) =>
            data.jobWorkModes?.some((item) => item.value === current)
              ? current
              : data.jobWorkModes?.[0]?.value || current
          );
        }
        if (data.jobEmploymentTypeOptions?.length) {
          setJobEmploymentTypeOptions(data.jobEmploymentTypeOptions);
          setEmploymentType((current) =>
            data.jobEmploymentTypeOptions?.some((item) => item.value === current)
              ? current
              : data.jobEmploymentTypeOptions?.[0]?.value || current
          );
        }
        if (data.jobPayUnitOptions?.length) {
          setJobPayUnitOptions(data.jobPayUnitOptions);
          setPayUnit((current) =>
            data.jobPayUnitOptions?.some((item) => item.value === current)
              ? current
              : data.jobPayUnitOptions?.[0]?.value || current
          );
        }
      } catch {
        // keep defaults
      }
    }
    void loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);

  const jobTypes = useMemo(() => getJobTypesForCategory(jobCategory, jobCategories), [jobCategory, jobCategories]);
  const needsCustomType = jobType === "Other";
  const payoutPreview = useMemo(
    () => getPhysicalWorkPayoutBreakdown(Number(payAmount) || 0),
    [payAmount]
  );
  const budgetPreview = useMemo(
    () => getJobBudgetRequired(Number(payAmount) || 0, Number(openings) || 0),
    [openings, payAmount]
  );

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

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/v2/admin/jobs/${jobId}`, {
      method: "PUT",
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
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      parsed = { error: tAdmin("errors.unexpectedServerResponse") };
    }

    setSaving(false);
    if (!res.ok) {
      setError(parsed.error || tAdmin("errors.updateFailed"));
      return;
    }

    setMessage(parsed.message || tAdmin("messages.updated"));
    router.refresh();
    emitDashboardLiveRefresh();
    onSaved?.();
  }

  return (
    <SectionCard elevated className="space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/60">{tAdmin("edit.eyebrow")}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">{tAdmin("edit.title")}</h3>
        <p className="mt-1 text-sm text-foreground/70">{tAdmin("edit.subtitle")}</p>
      </div>

      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tForm("fields.title")} className="min-h-11" />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tForm("fields.city")} className="min-h-11" />
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={tForm("fields.description")}
        className="min-h-[130px] w-full rounded-xl border border-foreground/15 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={jobCategory}
          onChange={(e) => {
            const next = e.target.value;
            setJobCategory(next);
            setJobType(getJobTypesForCategory(next, jobCategories)[0] || "Other");
            setCustomJobType("");
          }}
          className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground"
        >
          {jobCategories.map((category) => (
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
        <Input value={customJobType} onChange={(e) => setCustomJobType(e.target.value)} placeholder={tForm("fields.customJobType")} className="min-h-11" />
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground">
          {jobWorkModes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground">
          {jobEmploymentTypeOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Input value={openings} onChange={(e) => setOpenings(e.target.value)} type="number" min={1} placeholder={tForm("fields.openings")} className="min-h-11" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder={tForm("fields.state")} className="min-h-11" />
        <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder={tForm("fields.pincode")} className="min-h-11" />
        <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder={tForm("fields.addressLine")} className="min-h-11" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder={tForm("fields.latitude")} className="min-h-11" />
        <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder={tForm("fields.longitude")} className="min-h-11" />
        <Input value={hiringRadiusKm} onChange={(e) => setHiringRadiusKm(e.target.value)} type="number" min={1} placeholder={tForm("fields.hiringRadiusKm")} className="min-h-11" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" min={1} step="0.01" placeholder={tForm("fields.payAmount")} className="min-h-11" />
        <select value={payUnit} onChange={(e) => setPayUnit(e.target.value)} className="min-h-11 rounded-xl border border-foreground/15 bg-background/70 px-3 text-sm text-foreground">
          {jobPayUnitOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Input value={shiftSummary} onChange={(e) => setShiftSummary(e.target.value)} placeholder={tForm("fields.shiftSummary")} className="min-h-11" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{tForm("preview.workerTakeHome")}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">INR {formatMoney(payoutPreview.workerAmount)}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{tForm("preview.platformCut")}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {Math.round(payoutPreview.commissionRate * 100)}% | INR {formatMoney(payoutPreview.commissionAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{tForm("preview.fundRequired")}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">INR {formatMoney(budgetPreview)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{tForm("fields.startDate")}</p>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-11" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">{tForm("fields.applicationDeadline")}</p>
          <Input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} className="min-h-11" />
        </div>
      </div>

      <Input value={minEducation} onChange={(e) => setMinEducation(e.target.value)} placeholder={tForm("fields.minEducation")} className="min-h-11" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">{tForm("fields.requiredSkills")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder={tForm("fields.addSkill")}
              className="min-h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addChip(skillInput, requiredSkills, setRequiredSkills, 12)) setSkillInput("");
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={() => {
              if (addChip(skillInput, requiredSkills, setRequiredSkills, 12)) setSkillInput("");
            }}>{tForm("actions.add")}</Button>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <div className="flex flex-wrap gap-2">
              {requiredSkills.length === 0 ? (
                <span className="text-sm text-foreground/60">{tForm("emptySkills")}</span>
              ) : (
                requiredSkills.map((item) => (
                  <button key={item} type="button" onClick={() => setRequiredSkills((current) => current.filter((entry) => entry !== item))} className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                    <span>{item}</span>
                    <span className="text-foreground/50">x</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">{tForm("fields.requiredLanguages")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              placeholder={tForm("fields.addLanguage")}
              className="min-h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addChip(languageInput, requiredLanguages, setRequiredLanguages, 8)) setLanguageInput("");
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={() => {
              if (addChip(languageInput, requiredLanguages, setRequiredLanguages, 8)) setLanguageInput("");
            }}>{tForm("actions.add")}</Button>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <div className="flex flex-wrap gap-2">
              {requiredLanguages.length === 0 ? (
                <span className="text-sm text-foreground/60">{tForm("emptyLanguages")}</span>
              ) : (
                requiredLanguages.map((item) => (
                  <button key={item} type="button" onClick={() => setRequiredLanguages((current) => current.filter((entry) => entry !== item))} className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                    <span>{item}</span>
                    <span className="text-foreground/50">x</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? tAdmin("edit.saving") : tAdmin("edit.save")}
        </Button>
      </div>
    </SectionCard>
  );
}
