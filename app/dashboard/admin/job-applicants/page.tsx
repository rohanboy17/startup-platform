import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminJobApplicationActions from "@/components/admin-job-application-actions";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { formatMoney } from "@/lib/format-money";
import { parseProfileDetails } from "@/lib/user-profile";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAppSettings } from "@/lib/system-settings";
import { getTaxonomyOptionLabel } from "@/lib/work-taxonomy";
import { getWorkExperienceMap } from "@/lib/work-experience";
import { getTranslations } from "next-intl/server";

type SearchParams = {
  q?: string;
  limit?: string;
};

export default async function AdminJobApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const navT = await getTranslations("dashboard.nav");
  const t = await getTranslations("admin.jobApplicantsPage");
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const limit = params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const settings = await getAppSettings();

  const pendingJobApplications = await prisma.jobApplication.findMany({
    where: {
      managerStatus: "MANAGER_APPROVED",
      adminStatus: "PENDING",
      ...(q
        ? {
            OR: [
              { coverNote: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { job: { title: { contains: q, mode: "insensitive" } } },
              { job: { description: { contains: q, mode: "insensitive" } } },
              { job: { business: { email: { contains: q, mode: "insensitive" } } } },
              { job: { business: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      coverNote: true,
      createdAt: true,
      managerReviewedAt: true,
      job: {
        select: {
          title: true,
          status: true,
          employmentType: true,
          jobCategory: true,
          jobType: true,
          customJobType: true,
          city: true,
          state: true,
          payAmount: true,
          payUnit: true,
          business: {
            select: {
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileDetails: true,
          skills: {
            select: {
              skill: {
                select: { label: true },
              },
            },
          },
        },
      },
    },
    orderBy: { managerReviewedAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  const experienceMap = await getWorkExperienceMap(pendingJobApplications.map((application) => application.user.id));
  const internshipCount = pendingJobApplications.filter((application) => application.job.employmentType === "INTERNSHIP").length;
  const experiencedCount = pendingJobApplications.filter((application) => {
    const experience = experienceMap.get(application.user.id);
    return Boolean(experience && experience.totalWorkDays > 0);
  }).length;
  const oldestPendingAt = pendingJobApplications[0]?.managerReviewedAt || pendingJobApplications[0]?.createdAt || null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{navT("jobApplicants")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.pending")} value={pendingJobApplications.length} tone="warning" />
        <KpiCard label={t("kpis.internships")} value={internshipCount} tone="info" />
        <KpiCard label={t("kpis.withExperience")} value={experiencedCount} tone="success" />
        <KpiCard label={t("kpis.oldestWaiting")} value={oldestPendingAt ? new Date(oldestPendingAt).toLocaleDateString() : "-"} />
      </div>

      <SectionCard elevated className="p-4">
        <form className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t("filters.searchPlaceholder")}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          />
          <select
            name="limit"
            defaultValue={limit ? String(limit) : "ALL"}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="5">{t("filters.show5")}</option>
            <option value="10">{t("filters.show10")}</option>
            <option value="20">{t("filters.show20")}</option>
            <option value="ALL">{t("filters.showAll")}</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-foreground/15 bg-foreground/[0.06] px-3 py-2 text-sm text-foreground transition hover:bg-foreground/[0.10]"
          >
            {t("filters.apply")}
          </button>
        </form>
      </SectionCard>

      <div className="space-y-4">
        {pendingJobApplications.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/60">
              {t("empty")}
            </CardContent>
          </Card>
        ) : (
          pendingJobApplications.map((application) => {
            const profile = parseProfileDetails(application.user.profileDetails);
            const experience = experienceMap.get(application.user.id);
            const payout = getPhysicalWorkPayoutBreakdown(application.job.payAmount);

            return (
              <Card key={application.id} className="rounded-2xl border-foreground/10 bg-background/60">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{application.job.title}</p>
                      <p className="mt-1 text-sm text-foreground/70">
                      {application.user.name || application.user.email} | {application.job.business.name || "Business"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                        label={t("labels.jobStatus", { status: application.job.status })}
                        tone={
                          application.job.status === "OPEN"
                            ? "success"
                            : application.job.status === "PENDING_REVIEW"
                              ? "warning"
                              : "neutral"
                        }
                      />
                      {application.job.employmentType === "INTERNSHIP" ? (
                        <StatusBadge label={t("labels.internship")} tone="info" />
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 text-sm text-foreground/70 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <span className="text-foreground/50">{t("labels.category")}:</span>{" "}
                      {application.job.jobCategory} / {application.job.customJobType || application.job.jobType}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.location")}:</span> {application.job.city}, {application.job.state}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.pay")}:</span> INR {formatMoney(application.job.payAmount)} /{" "}
                      {getTaxonomyOptionLabel(
                        application.job.payUnit,
                        settings.jobPayUnitOptions,
                        application.job.payUnit
                      )}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.workerPayout")}:</span> INR {formatMoney(payout.workerAmount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("labels.experience")}</p>
                    <p className="mt-2 text-sm text-foreground/80">
                      {experience
                        ? t("labels.experienceLine", {
                            label: experience.experienceLabel,
                            total: experience.totalWorkDays,
                            digital: experience.digitalWorkDays,
                            physical: experience.physicalWorkDays,
                          })
                        : t("labels.noExperience")}
                    </p>
                    <p className="mt-2 text-sm text-foreground/65">
                      {profile.city || "-"}, {profile.state || "-"} | {profile.educationQualification || t("labels.notProvided")}
                    </p>
                    {application.coverNote ? <p className="mt-3 text-sm text-foreground/75">{application.coverNote}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {application.user.skills.length === 0 ? (
                      <span className="text-sm text-foreground/60">{t("labels.noSkills")}</span>
                    ) : (
                      application.user.skills.map((row) => (
                        <span key={`${application.id}-${row.skill.label}`} className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground/80">
                          {row.skill.label}
                        </span>
                      ))
                    )}
                  </div>

                  <AdminJobApplicationActions applicationId={application.id} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
