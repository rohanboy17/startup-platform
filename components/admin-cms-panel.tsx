"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import {
  getJobWorkModeOptions,
  getJobCategoryOptions,
  getLaunchSafeWorkTaxonomy,
  getProfileWorkModeOptions,
  getTaskCategoryOptions,
  INTERNSHIP_PREFERENCE_OPTIONS,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  normalizeCampaignCategoryOptions,
  normalizeTaxonomySelectOptions,
  normalizeWorkModeOptions,
  type CampaignCategoryOption,
  type TaxonomySelectOption,
  type WorkModeOption,
  type WorkTaxonomyCategory,
  WORK_TIME_OPTIONS,
  WORKING_PREFERENCE_OPTIONS,
} from "@/lib/work-taxonomy";

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

type CommunityFeedback = {
  id: string;
  displayName: string;
  roleLabel: string;
  quote: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  user: {
    name: string | null;
    email: string;
    role: string;
  };
};

type TaxonomyOptionConfig = {
  workModeOptions: WorkModeOption[];
  workTimeOptions: TaxonomySelectOption[];
  workingPreferenceOptions: TaxonomySelectOption[];
  internshipPreferenceOptions: TaxonomySelectOption[];
  jobEmploymentTypeOptions: TaxonomySelectOption[];
  jobPayUnitOptions: TaxonomySelectOption[];
};

export default function AdminCmsPanel({
  initialLandingHero,
  initialLandingSubtitle,
  initialTermsBody,
  initialPrivacyBody,
  initialRefundBody,
  initialFaqBody,
  initialWorkTaxonomy,
  initialCampaignCategoryOptions,
  initialTaxonomyOptionConfig,
  flags,
  announcements,
  communityFeedback,
}: {
  initialLandingHero: string;
  initialLandingSubtitle: string;
  initialTermsBody: string;
  initialPrivacyBody: string;
  initialRefundBody: string;
  initialFaqBody: string;
  initialWorkTaxonomy: WorkTaxonomyCategory[];
  initialCampaignCategoryOptions: CampaignCategoryOption[];
  initialTaxonomyOptionConfig: TaxonomyOptionConfig;
  flags: FeatureFlag[];
  announcements: Announcement[];
  communityFeedback: CommunityFeedback[];
}) {
  const router = useRouter();
  const [landingHero, setLandingHero] = useState(initialLandingHero);
  const [landingSubtitle, setLandingSubtitle] = useState(initialLandingSubtitle);
  const [termsBody, setTermsBody] = useState(initialTermsBody);
  const [privacyBody, setPrivacyBody] = useState(initialPrivacyBody);
  const [refundBody, setRefundBody] = useState(initialRefundBody);
  const [faqBody, setFaqBody] = useState(initialFaqBody);
  const [workTaxonomyText, setWorkTaxonomyText] = useState(
    JSON.stringify(initialWorkTaxonomy, null, 2)
  );
  const [campaignCategoryText, setCampaignCategoryText] = useState(
    JSON.stringify(initialCampaignCategoryOptions, null, 2)
  );
  const [taxonomyOptionText, setTaxonomyOptionText] = useState(
    JSON.stringify(initialTaxonomyOptionConfig, null, 2)
  );
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnMessage, setNewAnnMessage] = useState("");
  const [newAnnLink, setNewAnnLink] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementSegment, setAnnouncementSegment] = useState("ALL");
  const [announcementChannels, setAnnouncementChannels] = useState<Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM">>(["IN_APP"]);
  const [announcementLimit, setAnnouncementLimit] = useState<"5" | "10" | "20" | "ALL">("10");
  const [feedbackFilter, setFeedbackFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [feedbackLimit, setFeedbackLimit] = useState<"5" | "10" | "20" | "ALL">("10");
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>(
    Object.fromEntries(communityFeedback.map((item) => [item.id, item.adminNote || ""]))
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const taxonomyPreview = useMemo(() => {
    try {
      const parsedWorkTaxonomy = JSON.parse(workTaxonomyText) as unknown;
      const parsedCampaignCategoryOptions = JSON.parse(campaignCategoryText) as unknown;
      const parsedTaxonomyOptions = JSON.parse(taxonomyOptionText) as Partial<TaxonomyOptionConfig>;
      const workTaxonomy = getLaunchSafeWorkTaxonomy(parsedWorkTaxonomy);
      const campaignCategoryOptions = normalizeCampaignCategoryOptions(parsedCampaignCategoryOptions);
      const taskCategories = getTaskCategoryOptions(workTaxonomy);
      const jobCategories = getJobCategoryOptions(workTaxonomy);
      const workModeOptions = normalizeWorkModeOptions(parsedTaxonomyOptions.workModeOptions);
      const profileWorkModeOptions = getProfileWorkModeOptions(workModeOptions);
      const jobWorkModeOptions = getJobWorkModeOptions(workModeOptions);
      const workTimeOptions = normalizeTaxonomySelectOptions(
        parsedTaxonomyOptions.workTimeOptions,
        WORK_TIME_OPTIONS
      );
      const workingPreferenceOptions = normalizeTaxonomySelectOptions(
        parsedTaxonomyOptions.workingPreferenceOptions,
        WORKING_PREFERENCE_OPTIONS
      );
      const internshipPreferenceOptions = normalizeTaxonomySelectOptions(
        parsedTaxonomyOptions.internshipPreferenceOptions,
        INTERNSHIP_PREFERENCE_OPTIONS
      );
      const jobEmploymentTypeOptions = normalizeTaxonomySelectOptions(
        parsedTaxonomyOptions.jobEmploymentTypeOptions,
        JOB_EMPLOYMENT_TYPE_OPTIONS
      );
      const jobPayUnitOptions = normalizeTaxonomySelectOptions(
        parsedTaxonomyOptions.jobPayUnitOptions,
        JOB_PAY_UNIT_OPTIONS
      );
      return {
        error: "",
        workTaxonomy,
        campaignCategoryOptions,
        taskCategories,
        jobCategories,
        workModeOptions,
        profileWorkModeOptions,
        jobWorkModeOptions,
        workTimeOptions,
        workingPreferenceOptions,
        internshipPreferenceOptions,
        jobEmploymentTypeOptions,
        jobPayUnitOptions,
      };
    } catch {
      return {
        error: "Taxonomy JSON is invalid. Fix the JSON before saving.",
        workTaxonomy: [] as WorkTaxonomyCategory[],
        campaignCategoryOptions: [] as CampaignCategoryOption[],
        taskCategories: [] as ReturnType<typeof getTaskCategoryOptions>,
        jobCategories: [] as ReturnType<typeof getJobCategoryOptions>,
        workModeOptions: [] as WorkModeOption[],
        profileWorkModeOptions: [] as TaxonomySelectOption[],
        jobWorkModeOptions: [] as TaxonomySelectOption[],
        workTimeOptions: [] as TaxonomySelectOption[],
        workingPreferenceOptions: [] as TaxonomySelectOption[],
        internshipPreferenceOptions: [] as TaxonomySelectOption[],
        jobEmploymentTypeOptions: [] as TaxonomySelectOption[],
        jobPayUnitOptions: [] as TaxonomySelectOption[],
      };
    }
  }, [campaignCategoryText, taxonomyOptionText, workTaxonomyText]);

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

  async function updateFeedbackStatus(
    item: CommunityFeedback,
    status: "PENDING" | "APPROVED" | "REJECTED"
  ) {
    setLoading(`feedback:${item.id}:${status}`);
    setMessage("");
    const res = await fetch(`/api/admin/community-feedback/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, adminNote: feedbackNotes[item.id] || "" }),
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

  async function saveTaxonomySettings() {
    setLoading("taxonomy-settings");
    setMessage("");

    let workTaxonomy: unknown;
    let campaignCategoryOptions: unknown;
    let taxonomyOptions: Partial<TaxonomyOptionConfig>;
    try {
      workTaxonomy = JSON.parse(workTaxonomyText);
      campaignCategoryOptions = JSON.parse(campaignCategoryText);
      taxonomyOptions = JSON.parse(taxonomyOptionText) as Partial<TaxonomyOptionConfig>;
    } catch {
      setLoading(null);
      setMessage("Taxonomy JSON is invalid. Fix the JSON before saving.");
      return;
    }

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        workTaxonomy,
        campaignCategoryOptions,
        workModeOptions: taxonomyOptions.workModeOptions,
        workTimeOptions: taxonomyOptions.workTimeOptions,
        workingPreferenceOptions: taxonomyOptions.workingPreferenceOptions,
        internshipPreferenceOptions: taxonomyOptions.internshipPreferenceOptions,
        jobEmploymentTypeOptions: taxonomyOptions.jobEmploymentTypeOptions,
        jobPayUnitOptions: taxonomyOptions.jobPayUnitOptions,
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
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  const filteredFeedback =
    feedbackFilter === "ALL"
      ? communityFeedback
      : communityFeedback.filter((item) => item.status === feedbackFilter);
  const visibleFeedback =
    feedbackLimit === "ALL" ? filteredFeedback : filteredFeedback.slice(0, Number(feedbackLimit));
  const feedbackCounts = {
    ALL: communityFeedback.length,
    PENDING: communityFeedback.filter((item) => item.status === "PENDING").length,
    APPROVED: communityFeedback.filter((item) => item.status === "APPROVED").length,
    REJECTED: communityFeedback.filter((item) => item.status === "REJECTED").length,
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Landing Editor</h3>
        <Input value={landingHero} onChange={(e) => setLandingHero(e.target.value)} placeholder="Hero title" />
        <textarea
          value={landingSubtitle}
          onChange={(e) => setLandingSubtitle(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          placeholder="Hero subtitle"
        />
        <Button onClick={() => saveContent("landing.home", { heroTitle: landingHero, heroSubtitle: landingSubtitle })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "landing.home" ? "Saving..." : "Save Landing Content"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">FAQ & Legal Editor</h3>
        <textarea value={termsBody} onChange={(e) => setTermsBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground" placeholder="Terms body" />
        <Button onClick={() => saveContent("legal.terms", { body: termsBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.terms" ? "Saving..." : "Save Terms"}
        </Button>
        <textarea value={privacyBody} onChange={(e) => setPrivacyBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground" placeholder="Privacy body" />
        <Button onClick={() => saveContent("legal.privacy", { body: privacyBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.privacy" ? "Saving..." : "Save Privacy"}
        </Button>
        <textarea value={refundBody} onChange={(e) => setRefundBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground" placeholder="Refund policy body" />
        <Button onClick={() => saveContent("legal.refund", { body: refundBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.refund" ? "Saving..." : "Save Refund Policy"}
        </Button>
        <textarea value={faqBody} onChange={(e) => setFaqBody(e.target.value)} className="min-h-[90px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground" placeholder="FAQ body" />
        <Button onClick={() => saveContent("legal.faq", { body: faqBody })} disabled={loading !== null} className="w-full sm:w-auto">
          {loading === "legal.faq" ? "Saving..." : "Save FAQ"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Universal Work Taxonomy</h3>
          <p className="text-sm text-foreground/65">
            Edit the master taxonomy once and it flows into user profile preferences, business job creation,
            campaign creation, and admin review screens. Keep task-side entries launch-safe and operational.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
              Work taxonomy JSON
            </p>
            <textarea
              value={workTaxonomyText}
              onChange={(e) => setWorkTaxonomyText(e.target.value)}
              className="min-h-[420px] w-full rounded-xl border border-foreground/15 bg-background/60 px-4 py-3 font-mono text-xs text-foreground outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
              Campaign category JSON
            </p>
            <textarea
              value={campaignCategoryText}
              onChange={(e) => setCampaignCategoryText(e.target.value)}
              className="min-h-[220px] w-full rounded-xl border border-foreground/15 bg-background/60 px-4 py-3 font-mono text-xs text-foreground outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
              Job & profile option JSON
            </p>
            <textarea
              value={taxonomyOptionText}
              onChange={(e) => setTaxonomyOptionText(e.target.value)}
              className="min-h-[240px] w-full rounded-xl border border-foreground/15 bg-background/60 px-4 py-3 font-mono text-xs text-foreground outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Derived job categories
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{taxonomyPreview.jobCategories.length}</p>
                <p className="mt-2 text-sm text-foreground/60">
                  Business job create/edit and job review use these groups and types.
                </p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Derived task categories
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{taxonomyPreview.taskCategories.length}</p>
                <p className="mt-2 text-sm text-foreground/60">
                  Campaign task selection inherits these groups from the same master taxonomy.
                </p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Job work modes
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {taxonomyPreview.jobWorkModeOptions.length}
                </p>
                <p className="mt-2 text-sm text-foreground/60">
                  Live work-mode labels used across job create, edit, and admin review.
                </p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Profile preferences
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {taxonomyPreview.workTimeOptions.length + taxonomyPreview.workingPreferenceOptions.length + taxonomyPreview.internshipPreferenceOptions.length}
                </p>
                <p className="mt-2 text-sm text-foreground/60">
                  User profile selectors stay aligned with the same shared settings.
                </p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Employment & pay
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {taxonomyPreview.jobEmploymentTypeOptions.length + taxonomyPreview.jobPayUnitOptions.length}
                </p>
                <p className="mt-2 text-sm text-foreground/60">
                  Job employment types and pay-unit labels used in create/edit and read-only views.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Campaign options preview
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {taxonomyPreview.campaignCategoryOptions.map((option) => (
                  <span
                    key={option.value}
                    className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80"
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Job option preview
              </p>
              <div className="mt-3 space-y-3 text-xs text-foreground/80">
                <div>
                  <p className="font-medium text-foreground/60">Work modes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.jobWorkModeOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground/60">Employment types</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.jobEmploymentTypeOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground/60">Pay units</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.jobPayUnitOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Profile category preview
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {taxonomyPreview.workTaxonomy
                  .filter((category) => category.surfaces.includes("profile"))
                  .map((category) => (
                    <span
                      key={category.slug}
                      className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80"
                    >
                      {category.label}
                    </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Profile option preview
              </p>
              <div className="mt-3 space-y-3 text-xs text-foreground/80">
                <div>
                  <p className="font-medium text-foreground/60">Work modes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.profileWorkModeOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground/60">Work time</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.workTimeOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground/60">Working preference</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.workingPreferenceOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground/60">Internships</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taxonomyPreview.internshipPreferenceOptions.map((option) => (
                      <span
                        key={option.value}
                        className="rounded-full border border-foreground/10 px-3 py-1"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-foreground/55">
          Save only valid JSON. Categories and task/job types are fully shared from this taxonomy. Structured option
          groups such as work mode, employment type, pay unit, and profile preferences use platform-supported values,
          so invalid values fall back to the protected defaults.
        </p>
        {taxonomyPreview.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-300">{taxonomyPreview.error}</p>
        ) : null}
        <Button
          onClick={saveTaxonomySettings}
          disabled={loading !== null || Boolean(taxonomyPreview.error)}
          className="w-full sm:w-auto"
        >
          {loading === "taxonomy-settings" ? "Saving..." : "Save Universal Taxonomy"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Feature Flags</h3>
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.key} className="flex flex-col gap-3 rounded-md border border-foreground/10 bg-foreground/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="break-all text-sm font-medium">{flag.key}</p>
                <p className="text-xs text-foreground/60">{flag.description || "No description"}</p>
              </div>
              <Button onClick={() => toggleFlag(flag)} disabled={loading !== null} variant="outline" className="w-full sm:w-auto">
                {flag.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Banners & Announcements</h3>
        {editingAnnouncementId ? (
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            Editing selected announcement. Save changes or cancel to return to create mode.
          </p>
        ) : null}
        <Input value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} placeholder="Announcement title" />
        <textarea
          value={newAnnMessage}
          onChange={(e) => setNewAnnMessage(e.target.value)}
          className="min-h-[90px] w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          placeholder="Announcement message"
        />
        <Input value={newAnnLink} onChange={(e) => setNewAnnLink(e.target.value)} placeholder="Optional link" />
        <select
          value={announcementSegment}
          onChange={(e) => setAnnouncementSegment(e.target.value)}
          className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
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
              className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-3 py-3 text-sm text-foreground/80"
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
        <p className="text-xs text-foreground/55">
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
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-sm text-foreground/60">
              <span>Show</span>
              <select
                value={announcementLimit}
                onChange={(e) => setAnnouncementLimit(e.target.value as "5" | "10" | "20" | "ALL")}
                className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="ALL">Show all</option>
              </select>
            </label>
          </div>
          {(announcementLimit === "ALL" ? announcements : announcements.slice(0, Number(announcementLimit))).map((item) => (
            <div key={item.id} className="rounded-md border border-foreground/10 bg-foreground/[0.04] p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-foreground/70">{item.message}</p>
              {item.link ? <p className="break-all text-xs text-foreground/50">{item.link}</p> : null}
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

      <section className="space-y-4 rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Community Feedback Review</h3>
          <p className="text-sm text-foreground/65">
            New feedback stays hidden on the homepage until an admin approves it.
          </p>
          <p className="text-xs text-foreground/50">
            You can review submitted feedback in <span className="font-semibold text-foreground/80">Admin &gt; Content &amp; CMS</span>.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200/80">
              Pending Review
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{feedbackCounts.PENDING}</p>
            <p className="mt-2 text-sm text-foreground/60">
              Feedback waiting for an admin decision before it can appear publicly.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200/80">
              Approved Live
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{feedbackCounts.APPROVED}</p>
            <p className="mt-2 text-sm text-foreground/60">
              Approved feedback that can be shown in the homepage community section.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/15 bg-rose-500/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-200/80">
              Rejected
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{feedbackCounts.REJECTED}</p>
            <p className="mt-2 text-sm text-foreground/60">
              Reviewed feedback that was not approved for public display.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFeedbackFilter(status)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  feedbackFilter === status
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                    : "border-foreground/10 bg-foreground/[0.04] text-foreground/55 hover:bg-foreground/[0.08] hover:text-foreground/80"
                }`}
              >
                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()} ({feedbackCounts[status]})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground/60">
            <span>Show</span>
            <select
              value={feedbackLimit}
              onChange={(e) => setFeedbackLimit(e.target.value as "5" | "10" | "20" | "ALL")}
              className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="ALL">Show all</option>
            </select>
          </label>
        </div>

        <div className="space-y-3">
          {visibleFeedback.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/10 bg-foreground/[0.04] px-4 py-5 text-sm text-foreground/60">
              No feedback found for this filter yet.
            </div>
          ) : null}
          {visibleFeedback.map((item) => (
            <div key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{item.displayName}</p>
                    <span className="rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/55">
                      {item.roleLabel}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        item.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : item.status === "REJECTED"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">
                    Submitted by {item.user.name?.trim() || item.user.email} ({item.user.role})
                  </p>
                  <p className="text-sm leading-7 text-foreground/80">{item.quote}</p>
                  <p className="text-xs text-foreground/45">
                    Submitted {new Date(item.createdAt).toLocaleString("en-IN")}
                    {item.reviewedAt ? ` | Reviewed ${new Date(item.reviewedAt).toLocaleString("en-IN")}` : ""}
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-foreground/45">Admin note</label>
                    <textarea
                      value={feedbackNotes[item.id] || ""}
                      onChange={(event) =>
                        setFeedbackNotes((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className="min-h-[72px] w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-400/35 focus:ring-2 focus:ring-emerald-400/15"
                      placeholder="Optional internal note for this review"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                  {item.status !== "APPROVED" ? (
                    <Button
                      onClick={() => void updateFeedbackStatus(item, "APPROVED")}
                      disabled={loading !== null}
                      className="w-full sm:w-auto"
                    >
                      {loading === `feedback:${item.id}:APPROVED` ? "Saving..." : "Approve"}
                    </Button>
                  ) : null}
                  {item.status !== "REJECTED" ? (
                    <Button
                      variant="destructive"
                      onClick={() => void updateFeedbackStatus(item, "REJECTED")}
                      disabled={loading !== null}
                      className="w-full sm:w-auto"
                    >
                      {loading === `feedback:${item.id}:REJECTED` ? "Saving..." : "Reject"}
                    </Button>
                  ) : null}
                  {item.status !== "PENDING" ? (
                    <Button
                      variant="outline"
                      onClick={() => void updateFeedbackStatus(item, "PENDING")}
                      disabled={loading !== null}
                      className="w-full sm:w-auto"
                    >
                      {loading === `feedback:${item.id}:PENDING` ? "Saving..." : "Move to Pending"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
    </div>
  );
}
