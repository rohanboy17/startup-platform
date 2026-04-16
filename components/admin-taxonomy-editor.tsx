"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import {
  normalizeCampaignCategoryOptions,
  normalizeTaxonomySelectOptions,
  normalizeWorkModeOptions,
  type CampaignCategoryOption,
  type TaxonomySelectOption,
  type WorkModeOption,
  type WorkSurface,
  type WorkTaxonomyCategory,
  INTERNSHIP_PREFERENCE_OPTIONS,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  WORK_TIME_OPTIONS,
  WORKING_PREFERENCE_OPTIONS,
} from "@/lib/work-taxonomy";

export type AdminTaxonomyOptionConfig = {
  workModeOptions: WorkModeOption[];
  workTimeOptions: TaxonomySelectOption[];
  workingPreferenceOptions: TaxonomySelectOption[];
  internshipPreferenceOptions: TaxonomySelectOption[];
  jobEmploymentTypeOptions: TaxonomySelectOption[];
  jobPayUnitOptions: TaxonomySelectOption[];
};

type OptionKey = "workTimeOptions" | "workingPreferenceOptions" | "internshipPreferenceOptions" | "jobEmploymentTypeOptions" | "jobPayUnitOptions";
const SURFACES: WorkSurface[] = ["profile", "job", "campaign"];
const OPTION_GROUPS: Array<{ key: OptionKey; title: string }> = [
  { key: "workTimeOptions", title: "Work time labels" },
  { key: "workingPreferenceOptions", title: "Working preference labels" },
  { key: "internshipPreferenceOptions", title: "Internship preference labels" },
  { key: "jobEmploymentTypeOptions", title: "Employment type labels" },
  { key: "jobPayUnitOptions", title: "Pay unit labels" },
];
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export default function AdminTaxonomyEditor({ initialWorkTaxonomy, initialCampaignCategoryOptions, initialTaxonomyOptionConfig }: { initialWorkTaxonomy: WorkTaxonomyCategory[]; initialCampaignCategoryOptions: CampaignCategoryOption[]; initialTaxonomyOptionConfig: AdminTaxonomyOptionConfig; }) {
  const router = useRouter();
  const [workTaxonomy, setWorkTaxonomy] = useState(initialWorkTaxonomy.map((item) => ({ ...item, surfaces: [...item.surfaces], jobTypes: item.jobTypes.map((t) => ({ ...t })), taskTypes: item.taskTypes.map((t) => ({ ...t })) })));
  const [campaignCategoryOptions, setCampaignCategoryOptions] = useState(initialCampaignCategoryOptions.map((item) => ({ ...item })));
  const [taxonomyOptions, setTaxonomyOptions] = useState<AdminTaxonomyOptionConfig>({
    workModeOptions: initialTaxonomyOptionConfig.workModeOptions.map((item) => ({ ...item, surfaces: [...item.surfaces] })),
    workTimeOptions: initialTaxonomyOptionConfig.workTimeOptions.map((item) => ({ ...item })),
    workingPreferenceOptions: initialTaxonomyOptionConfig.workingPreferenceOptions.map((item) => ({ ...item })),
    internshipPreferenceOptions: initialTaxonomyOptionConfig.internshipPreferenceOptions.map((item) => ({ ...item })),
    jobEmploymentTypeOptions: initialTaxonomyOptionConfig.jobEmploymentTypeOptions.map((item) => ({ ...item })),
    jobPayUnitOptions: initialTaxonomyOptionConfig.jobPayUnitOptions.map((item) => ({ ...item })),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const updateCategory = (i: number, patch: Partial<WorkTaxonomyCategory>) => setWorkTaxonomy((rows) => rows.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const updateType = (i: number, key: "jobTypes" | "taskTypes", j: number, field: "label" | "slug", value: string) => setWorkTaxonomy((rows) => rows.map((row, idx) => idx === i ? { ...row, [key]: row[key].map((item, k) => k === j ? { ...item, [field]: value } : item) } : row));
  const toggleSurface = (i: number, surface: WorkSurface) => setWorkTaxonomy((rows) => rows.map((row, idx) => idx === i ? { ...row, surfaces: row.surfaces.includes(surface) ? row.surfaces.filter((item) => item !== surface) : [...row.surfaces, surface] } : row));
  const hasBlockingIssue = workTaxonomy.some((row) => !row.label.trim() || !slugify(row.slug || row.label) || !row.description.trim() || row.surfaces.length === 0 || (row.jobTypes.length === 0 && row.taskTypes.length === 0) || row.jobTypes.some((t) => !t.label.trim()) || row.taskTypes.some((t) => !t.label.trim())) || campaignCategoryOptions.some((row) => !row.label.trim() || !slugify(row.value || row.label) || !row.description.trim()) || taxonomyOptions.workModeOptions.some((row) => !row.label.trim() || row.surfaces.length === 0) || OPTION_GROUPS.some((group) => taxonomyOptions[group.key].some((row) => !row.label.trim()));
  async function save() {
    setLoading(true); setMessage("");
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({
      workTaxonomy: workTaxonomy.map((row) => ({ ...row, slug: slugify(row.slug || row.label), jobTypes: row.jobTypes.map((t) => ({ ...t, slug: slugify(t.slug || t.label) })), taskTypes: row.taskTypes.map((t) => ({ ...t, slug: slugify(t.slug || t.label) })) })),
      campaignCategoryOptions: normalizeCampaignCategoryOptions(campaignCategoryOptions.map((row) => ({ ...row, value: slugify(row.value || row.label) }))),
      workModeOptions: normalizeWorkModeOptions(taxonomyOptions.workModeOptions),
      workTimeOptions: normalizeTaxonomySelectOptions(taxonomyOptions.workTimeOptions, WORK_TIME_OPTIONS),
      workingPreferenceOptions: normalizeTaxonomySelectOptions(taxonomyOptions.workingPreferenceOptions, WORKING_PREFERENCE_OPTIONS),
      internshipPreferenceOptions: normalizeTaxonomySelectOptions(taxonomyOptions.internshipPreferenceOptions, INTERNSHIP_PREFERENCE_OPTIONS),
      jobEmploymentTypeOptions: normalizeTaxonomySelectOptions(taxonomyOptions.jobEmploymentTypeOptions, JOB_EMPLOYMENT_TYPE_OPTIONS),
      jobPayUnitOptions: normalizeTaxonomySelectOptions(taxonomyOptions.jobPayUnitOptions, JOB_PAY_UNIT_OPTIONS),
    }) });
    const raw = await res.text(); let data: { message?: string; error?: string } = {}; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: "Unexpected server response" }; }
    setLoading(false); setMessage(data.message || data.error || "Updated"); if (res.ok) { router.refresh(); emitDashboardLiveRefresh(); }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
      <div className="space-y-1"><h3 className="text-lg font-semibold">Universal Work Taxonomy</h3><p className="text-sm text-foreground/65">Manage shared categories, stable slugs, and platform labels without raw JSON. Slugs are the stable IDs that keep historical jobs and campaigns mapped when names change later.</p></div>
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-foreground/75">Change labels freely. Change slugs only when you intentionally want a new identity.</div>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Work areas</p><p className="text-xs text-foreground/60">Shared across profile, jobs, and campaigns.</p></div><Button type="button" variant="outline" onClick={() => setWorkTaxonomy((rows) => [...rows, { slug: "new-work-area", label: "New work area", description: "Describe where this category should be used.", surfaces: ["profile"], jobTypes: [], taskTypes: [{ slug: "new-task-type", label: "New task type" }] }])}>Add work area</Button></div>
        {workTaxonomy.map((row, i) => (
          <div key={`${row.slug}-${i}`} className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Work area {i + 1}</p><Button type="button" variant="outline" size="sm" onClick={() => setWorkTaxonomy((rows) => rows.filter((_, idx) => idx !== i))} disabled={workTaxonomy.length <= 1 || row.slug === "other"}>Remove</Button></div>
            <div className="grid gap-3 md:grid-cols-2"><Input value={row.label} onChange={(e) => updateCategory(i, { label: e.target.value })} placeholder="Field Operations & Audits" /><Input value={row.slug} onChange={(e) => updateCategory(i, { slug: e.target.value })} onBlur={(e) => updateCategory(i, { slug: slugify(e.target.value || row.label) })} placeholder="field-operations-audits" /></div>
            <textarea value={row.description} onChange={(e) => updateCategory(i, { description: e.target.value })} className="min-h-[84px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20" />
            <div className="flex flex-wrap gap-2">{SURFACES.map((surface) => <button key={surface} type="button" onClick={() => toggleSurface(i, surface)} className={`rounded-full border px-3 py-1 text-xs transition ${row.surfaces.includes(surface) ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100" : "border-foreground/10 bg-background/70 text-foreground/70 hover:bg-background"}`}>{surface}</button>)}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Job types</p><Button type="button" size="sm" variant="outline" onClick={() => setWorkTaxonomy((rows) => rows.map((item, idx) => idx === i ? { ...item, jobTypes: [...item.jobTypes, { slug: "new-job-type", label: "New job type" }] } : item))}>Add</Button></div>{row.jobTypes.map((item, j) => <div key={`${item.slug}-${j}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input value={item.label} onChange={(e) => updateType(i, "jobTypes", j, "label", e.target.value)} /><Input value={item.slug} onChange={(e) => updateType(i, "jobTypes", j, "slug", e.target.value)} onBlur={(e) => updateType(i, "jobTypes", j, "slug", slugify(e.target.value || item.label))} /><Button type="button" variant="outline" size="sm" onClick={() => setWorkTaxonomy((rows) => rows.map((item2, idx) => idx === i ? { ...item2, jobTypes: item2.jobTypes.filter((_, k) => k !== j) } : item2))}>Remove</Button></div>)}{row.jobTypes.length === 0 ? <p className="text-sm text-foreground/55">No job types yet.</p> : null}</div>
              <div className="space-y-2 rounded-2xl border border-foreground/10 bg-background/40 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Task types</p><Button type="button" size="sm" variant="outline" onClick={() => setWorkTaxonomy((rows) => rows.map((item, idx) => idx === i ? { ...item, taskTypes: [...item.taskTypes, { slug: "new-task-type", label: "New task type" }] } : item))}>Add</Button></div>{row.taskTypes.map((item, j) => <div key={`${item.slug}-${j}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input value={item.label} onChange={(e) => updateType(i, "taskTypes", j, "label", e.target.value)} /><Input value={item.slug} onChange={(e) => updateType(i, "taskTypes", j, "slug", e.target.value)} onBlur={(e) => updateType(i, "taskTypes", j, "slug", slugify(e.target.value || item.label))} /><Button type="button" variant="outline" size="sm" onClick={() => setWorkTaxonomy((rows) => rows.map((item2, idx) => idx === i ? { ...item2, taskTypes: item2.taskTypes.filter((_, k) => k !== j) } : item2))}>Remove</Button></div>)}{row.taskTypes.length === 0 ? <p className="text-sm text-foreground/55">No task types yet.</p> : null}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Campaign groups</p><p className="text-xs text-foreground/60">Top-level business campaign choices.</p></div><Button type="button" variant="outline" onClick={() => setCampaignCategoryOptions((rows) => [...rows, { value: "new-category", label: "New campaign category", description: "Describe when businesses should choose this category." }])}>Add campaign group</Button></div>{campaignCategoryOptions.map((row, i) => <div key={`${row.value}-${i}`} className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Campaign group {i + 1}</p><Button type="button" variant="outline" size="sm" onClick={() => setCampaignCategoryOptions((rows) => rows.filter((_, idx) => idx !== i))} disabled={campaignCategoryOptions.length <= 1}>Remove</Button></div><div className="grid gap-3 md:grid-cols-2"><Input value={row.label} onChange={(e) => setCampaignCategoryOptions((rows) => rows.map((item, idx) => idx === i ? { ...item, label: e.target.value } : item))} /><Input value={row.value} onChange={(e) => setCampaignCategoryOptions((rows) => rows.map((item, idx) => idx === i ? { ...item, value: e.target.value } : item))} onBlur={(e) => setCampaignCategoryOptions((rows) => rows.map((item, idx) => idx === i ? { ...item, value: slugify(e.target.value || item.label) } : item))} /></div><textarea value={row.description} onChange={(e) => setCampaignCategoryOptions((rows) => rows.map((item, idx) => idx === i ? { ...item, description: e.target.value } : item))} className="min-h-[80px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20" /></div>)}</div>
      <div className="space-y-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4"><div><p className="text-sm font-semibold">Job and profile selector labels</p><p className="text-xs text-foreground/60">Platform-supported options are editable here without raw JSON.</p></div><div className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4"><p className="text-sm font-semibold">Work modes</p>{taxonomyOptions.workModeOptions.map((row, i) => <div key={row.value} className="space-y-3 rounded-2xl border border-foreground/10 bg-background/60 p-4"><div className="grid gap-3 md:grid-cols-[160px_1fr]"><div className="rounded-md border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">{row.value}</div><Input value={row.label} onChange={(e) => setTaxonomyOptions((current) => ({ ...current, workModeOptions: current.workModeOptions.map((item, idx) => idx === i ? { ...item, label: e.target.value } : item) }))} /></div><div className="flex flex-wrap gap-2">{SURFACES.map((surface) => <button key={surface} type="button" onClick={() => setTaxonomyOptions((current) => ({ ...current, workModeOptions: current.workModeOptions.map((item, idx) => idx === i ? { ...item, surfaces: item.surfaces.includes(surface) ? item.surfaces.filter((entry) => entry !== surface) : [...item.surfaces, surface] } : item) }))} className={`rounded-full border px-3 py-1 text-xs transition ${row.surfaces.includes(surface) ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100" : "border-foreground/10 bg-background/70 text-foreground/70 hover:bg-background"}`}>{surface}</button>)}</div></div>)}</div><div className="grid gap-4 xl:grid-cols-2">{OPTION_GROUPS.map((group) => <div key={group.key} className="space-y-3 rounded-2xl border border-foreground/10 bg-background/50 p-4"><p className="text-sm font-semibold">{group.title}</p>{taxonomyOptions[group.key].map((row, i) => <div key={row.value} className="grid gap-3 md:grid-cols-[160px_1fr]"><div className="rounded-md border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">{row.value}</div><Input value={row.label} onChange={(e) => setTaxonomyOptions((current) => ({ ...current, [group.key]: current[group.key].map((item, idx) => idx === i ? { ...item, label: e.target.value } : item) }))} /></div>)}</div>)}</div></div>
      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      <Button type="button" onClick={() => void save()} disabled={loading || hasBlockingIssue}>{loading ? "Saving..." : "Save Universal Taxonomy"}</Button>
    </section>
  );
}
