import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format-money";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import AdminJobActions from "@/components/admin-job-actions";
import { getTranslations } from "next-intl/server";

type SearchParams = {
  q?: string;
  status?: "ALL" | "PENDING_REVIEW" | "OPEN" | "REJECTED" | "PAUSED" | "CLOSED" | "FILLED";
  limit?: string;
};

function toneForStatus(status: "PENDING_REVIEW" | "OPEN" | "REJECTED" | "PAUSED" | "CLOSED" | "FILLED") {
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "OPEN") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "PAUSED") return "warning";
  if (status === "FILLED") return "info";
  return "neutral";
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("admin.jobsPage");
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "ALL";
  const limit = params.limit === "ALL" ? null : [5, 10, 20].includes(Number(params.limit)) ? Number(params.limit) : 10;

  const [pendingCount, openCount, pausedCount, filledCount, closedCount, rejectedCount, jobs] = await Promise.all([
    prisma.jobPosting.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.jobPosting.count({ where: { status: "OPEN" } }),
    prisma.jobPosting.count({ where: { status: "PAUSED" } }),
    prisma.jobPosting.count({ where: { status: "FILLED" } }),
    prisma.jobPosting.count({ where: { status: "CLOSED" } }),
    prisma.jobPosting.count({ where: { status: "REJECTED" } }),
    prisma.jobPosting.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { state: { contains: q, mode: "insensitive" } },
                { business: { email: { contains: q, mode: "insensitive" } } },
                { business: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">{t("pageTitle")}</h2>
        <p className="max-w-3xl text-sm text-foreground/70">{t("pageDescription")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("kpis.pending")} value={pendingCount} tone="warning" />
        <KpiCard label={t("kpis.open")} value={openCount} tone="success" />
        <KpiCard label={t("kpis.paused")} value={pausedCount} tone="warning" />
        <KpiCard label={t("kpis.filled")} value={filledCount} tone="info" />
        <KpiCard label={t("kpis.closed")} value={closedCount} />
        <KpiCard label={t("kpis.rejected")} value={rejectedCount} tone="danger" />
      </div>

      <SectionCard elevated className="p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t("filters.searchPlaceholder")}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="ALL">{t("filters.allStatuses")}</option>
            <option value="PENDING_REVIEW">{t("status.PENDING_REVIEW")}</option>
            <option value="OPEN">{t("status.OPEN")}</option>
            <option value="REJECTED">{t("status.REJECTED")}</option>
            <option value="PAUSED">{t("status.PAUSED")}</option>
            <option value="FILLED">{t("status.FILLED")}</option>
            <option value="CLOSED">{t("status.CLOSED")}</option>
          </select>
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
        {jobs.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">{t("empty")}</CardContent>
          </Card>
        ) : (
          jobs.map((job) => {
            const applied = job.applications.filter((item) => item.status === "APPLIED").length;
            const shortlisted = job.applications.filter((item) => item.status === "SHORTLISTED").length;
            const hired = job.applications.filter((item) => ["HIRED", "JOINED"].includes(item.status)).length;

            return (
              <Card key={job.id} className="rounded-2xl border-foreground/10 bg-background/60">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{job.title}</p>
                      <p className="mt-1 text-sm text-foreground/70">
                        {job.business.name || t("fallback.business")} ({job.business.email})
                      </p>
                    </div>
                    <StatusBadge label={t(`status.${job.status}`)} tone={toneForStatus(job.status)} />
                  </div>

                  <p className="text-sm text-foreground/70">{job.description}</p>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-foreground/70">
                    <div>
                      <span className="text-foreground/50">{t("labels.category")}:</span>{" "}
                      {job.jobCategory} / {job.customJobType || job.jobType}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.location")}:</span>{" "}
                      {job.city}, {job.state}{job.pincode ? ` ${job.pincode}` : ""}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.pay")}:</span>{" "}
                      INR {formatMoney(job.payAmount)} / {t(`payUnits.${job.payUnit}`)}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.workerPayout")}:</span>{" "}
                      INR {formatMoney(getPhysicalWorkPayoutBreakdown(job.payAmount).workerAmount)}
                    </div>
                    <div>
                      <span className="text-foreground/50">{t("labels.workType")}:</span>{" "}
                      {t(`workModes.${job.workMode}`)} / {t(`employmentTypes.${job.employmentType}`)}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label={t("cards.openings")} value={job.openings} />
                    <KpiCard label={t("cards.applied")} value={applied} tone="warning" />
                    <KpiCard label={t("cards.shortlisted")} value={shortlisted} tone="success" />
                    <KpiCard label={t("cards.hired")} value={hired} tone="info" />
                  </div>

                  <p className="text-xs text-foreground/55">
                    {t("labels.createdAt")}: {new Date(job.createdAt).toLocaleString()}
                  </p>

                  <AdminJobActions
                    jobId={job.id}
                      currentStatus={job.status}
                      initialJob={{
                        title: job.title,
                      description: job.description,
                      jobCategory: job.jobCategory,
                      jobType: job.jobType,
                      customJobType: job.customJobType,
                      workMode: job.workMode,
                      employmentType: job.employmentType,
                      city: job.city,
                      state: job.state,
                      pincode: job.pincode,
                      addressLine: job.addressLine,
                      latitude: job.latitude,
                      longitude: job.longitude,
                      hiringRadiusKm: job.hiringRadiusKm,
                      openings: job.openings,
                      payAmount: job.payAmount,
                      payUnit: job.payUnit,
                      shiftSummary: job.shiftSummary,
                      startDate: job.startDate?.toISOString() || null,
                      applicationDeadline: job.applicationDeadline?.toISOString() || null,
                        requiredSkills: job.requiredSkills,
                        requiredLanguages: job.requiredLanguages,
                        minEducation: job.minEducation,
                      }}
                    />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
