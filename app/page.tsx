import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, TrendingUp, Users, Briefcase, Timer } from "lucide-react";
import HomeLiveSection from "@/components/home-live-section";
import MotionSection from "@/components/motion-section";
import HomeHeroVisual from "@/components/home-hero-visual";
import MetricCounter from "@/components/metric-counter";
import HomeHeroText from "@/components/home-hero-text";
import HomeHeroFloats from "@/components/home-hero-floats";
import HomeParallaxOrbs from "@/components/home-parallax-orbs";
import { MotionItem, MotionStagger } from "@/components/motion-stagger";
import { getCmsValue, getFeatureFlag } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/ui/section-card";
import { KpiCard } from "@/components/ui/kpi-card";

type LandingContent = {
  heroTitle: string;
  heroSubtitle: string;
};

type ApprovalLog = {
  createdAt: Date;
  details: string | null;
};

function formatDurationFromMinutes(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "-";
  if (minutes < 90) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} hrs`;
}

function extractSubmissionId(details: string | null) {
  if (!details) return null;
  const match = details.match(/submissionId=([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

export default async function Home() {
  const now = new Date();
  const [
    landing,
    showAnnouncements,
    showStats,
    showFeatures,
    showLiveActivity,
    announcements,
    totalPayout,
    totalUsers,
    businessAccounts,
    activeCampaigns,
    tasksCompleted,
    approvalLogs,
  ] = await Promise.all([
    getCmsValue<LandingContent>("landing.home", {
      heroTitle: "Earn by completing verified tasks.",
      heroSubtitle:
        "EarnHub is a secure two-sided marketplace where users complete verified tasks and businesses launch measurable growth campaigns.",
    }),
    getFeatureFlag("home.announcements", true),
    getFeatureFlag("home.stats", true),
    getFeatureFlag("home.features", true),
    getFeatureFlag("home.liveActivity", true),
    prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "BUSINESS" } }),
    prisma.campaign.count({ where: { status: "LIVE" } }),
    prisma.submission.count({
      where: { adminStatus: { in: ["ADMIN_APPROVED", "APPROVED"] } },
    }),
    prisma.activityLog.findMany({
      where: { action: "ADMIN_APPROVED_SUBMISSION" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { createdAt: true, details: true },
    }),
  ]);

  const approvalLogIds = approvalLogs
    .map((log: ApprovalLog) => extractSubmissionId(log.details))
    .filter((id): id is string => Boolean(id));
  const uniqueIds = Array.from(new Set(approvalLogIds)).slice(0, 150);

  const approvalSubmissions = uniqueIds.length
    ? await prisma.submission.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, createdAt: true },
      })
    : [];

  const submissionCreatedAt = new Map(
    approvalSubmissions.map((submission) => [submission.id, submission.createdAt])
  );

  let approvalMinutesTotal = 0;
  let approvalSamples = 0;
  for (const log of approvalLogs) {
    const submissionId = extractSubmissionId(log.details);
    if (!submissionId) continue;
    const createdAt = submissionCreatedAt.get(submissionId);
    if (!createdAt) continue;
    const diffMinutes = (log.createdAt.getTime() - createdAt.getTime()) / (1000 * 60);
    if (diffMinutes > 0) {
      approvalMinutesTotal += diffMinutes;
      approvalSamples += 1;
    }
  }

  const avgApprovalMinutes = approvalSamples ? approvalMinutesTotal / approvalSamples : 0;
  const avgApprovalTimeLabel = formatDurationFromMinutes(avgApprovalMinutes);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.22),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="bg-grid" />
      </div>
      <HomeParallaxOrbs />

      {showAnnouncements && announcements.length > 0 ? (
        <section className="relative mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
            {announcements.map((item) => (
              <p key={item.id}>
                <span className="font-semibold">{item.title}: </span>
                {item.message}
                {item.link ? (
                  <Link href={item.link} className="ml-2 underline hover:text-foreground">
                    Learn more
                  </Link>
                ) : null}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative mx-auto grid w-full max-w-screen-2xl items-stretch gap-8 px-4 pb-16 pt-8 sm:gap-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <MotionSection className="min-w-0">
          <HomeHeroText
            title={landing.heroTitle}
            subtitle={landing.heroSubtitle}
            avgApprovalTimeLabel={avgApprovalTimeLabel}
          />
          <div className="mt-6 sm:mt-8">
            <HomeHeroFloats
              totalPayout={totalPayout._sum.amount || 0}
              totalUsers={totalUsers}
              tasksCompleted={tasksCompleted}
              businessAccounts={businessAccounts}
            />
          </div>
          {showStats ? (
            <MotionSection
              className="mt-8 w-full sm:mt-10"
              delay={0.1}
            >
              <SectionCard elevated>
                <MotionStagger className="grid w-full grid-cols-2 gap-3 auto-rows-fr sm:grid-cols-3 lg:grid-cols-5">
                  <MotionItem>
                    <KpiCard
                      label="Total Platform Payout"
                      value={<MetricCounter value={Math.round(totalPayout._sum.amount || 0)} formatter="inr" />}
                      tone="success"
                    />
                  </MotionItem>

                  <MotionItem>
                    <KpiCard label="Tasks Completed" value={<MetricCounter value={tasksCompleted} />} />
                  </MotionItem>

                  <MotionItem>
                    <KpiCard label="Active Campaigns" value={<MetricCounter value={activeCampaigns} />} tone="info" />
                  </MotionItem>

                  <MotionItem>
                    <KpiCard label="Business Accounts" value={<MetricCounter value={businessAccounts} />} />
                  </MotionItem>

                  <MotionItem>
                    <KpiCard label="Total Users" value={<MetricCounter value={totalUsers} />} />
                  </MotionItem>
                </MotionStagger>
              </SectionCard>
            </MotionSection>
          ) : null}
        </MotionSection>

        <div className="mx-auto w-full max-w-full min-w-0 space-y-6">
          <HomeHeroVisual
            stats={{
              totalUsers,
              businessAccounts,
              tasksCompleted,
              totalPayout: totalPayout._sum.amount || 0,
            }}
          />
          {showLiveActivity ? (
            <div id="live-activity">
              <HomeLiveSection />
            </div>
          ) : null}
        </div>
      </section>

      <section id="how-it-works" className="relative mx-auto w-full max-w-screen-2xl px-4 pb-12 sm:px-6 sm:pb-16">
        <MotionStagger className="grid gap-6 lg:grid-cols-2">
          <MotionItem className="rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:p-7">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-foreground/60">How it works</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Earn in three simple steps</h2>
              <ul className="space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  Pick a verified task and follow the instructions.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                  Submit proof and track your status in real time.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                  Get approved and receive wallet credits quickly.
                </li>
              </ul>
            </div>
          </MotionItem>
          <MotionItem className="rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:p-7">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-foreground/60">For businesses</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Launch campaigns without noise</h2>
              <ul className="space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  Fund your wallet, set budget and reward per task.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                  Receive moderated submissions with fraud signals.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                  Track ROI with live analytics and export-ready reports.
                </li>
              </ul>
            </div>
          </MotionItem>
        </MotionStagger>
      </section>

      {showFeatures ? (
        <section className="relative mx-auto w-full max-w-screen-2xl px-4 pb-12 sm:px-6 sm:pb-16">
          <MotionStagger className="grid gap-5 sm:gap-6 md:grid-cols-3 auto-rows-fr">
            <MotionItem className="flex h-full flex-col rounded-2xl border border-foreground/10 bg-foreground/5 p-5 backdrop-blur-none sm:p-6 sm:backdrop-blur-md">
              <ShieldCheck className="text-emerald-500" />
              <h3 className="mt-4 text-xl font-semibold">Secure By Design</h3>
              <p className="mt-2 text-foreground/65">
                Wallet ledger, moderation pipeline, and atomic reward settlement for trust at scale.
              </p>
            </MotionItem>
            <MotionItem className="flex h-full flex-col rounded-2xl border border-foreground/10 bg-foreground/5 p-5 backdrop-blur-none sm:p-6 sm:backdrop-blur-md">
              <Zap className="text-sky-500" />
              <h3 className="mt-4 text-xl font-semibold">Fast Campaign Launch</h3>
              <p className="mt-2 text-foreground/65">
                Fund your business wallet, create campaigns, and start receiving submissions in minutes.
              </p>
            </MotionItem>
            <MotionItem className="flex h-full flex-col rounded-2xl border border-foreground/10 bg-foreground/5 p-5 backdrop-blur-none sm:p-6 sm:backdrop-blur-md">
              <TrendingUp className="text-violet-500" />
              <h3 className="mt-4 text-xl font-semibold">Actionable Growth</h3>
              <p className="mt-2 text-foreground/65">
                Monitor campaign flow, approvals, and platform revenue from your analytics dashboards.
              </p>
            </MotionItem>
          </MotionStagger>
        </section>
      ) : null}

      <section id="trust" className="relative mx-auto w-full max-w-screen-2xl px-4 pb-12 sm:px-6 sm:pb-16">
        <MotionStagger className="grid gap-6 md:grid-cols-3 auto-rows-fr">
          <MotionItem className="flex h-full flex-col rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:p-7">
            <Users className="text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold">Real users, real work</h3>
            <p className="mt-2 text-sm text-foreground/70">
              We show only anonymized activity and verified submissions to protect privacy.
            </p>
          </MotionItem>
          <MotionItem className="flex h-full flex-col rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:p-7">
            <Briefcase className="text-sky-500" />
            <h3 className="mt-4 text-lg font-semibold">Transparent costs</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Clear commission breakdowns and funding fees so you know exactly where budgets go.
            </p>
          </MotionItem>
          <MotionItem className="flex h-full flex-col rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:p-7">
            <Timer className="text-violet-500" />
            <h3 className="mt-4 text-lg font-semibold">Reliable approvals</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Average approval time: {avgApprovalTimeLabel}. Automated alerts keep queues moving.
            </p>
          </MotionItem>
        </MotionStagger>
      </section>

      <section className="relative mx-auto w-full max-w-screen-2xl px-4 pb-16 sm:px-6 sm:pb-20">
        <MotionSection className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:flex-row sm:items-center sm:p-7">
          <div>
            <h2 className="text-2xl font-semibold">Ready to start earning?</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Join thousands of users completing verified tasks every week.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:scale-105"
            >
              Start Earning <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-foreground/25 px-5 py-2.5 text-sm text-foreground/90 transition hover:bg-foreground/10"
            >
              Create Campaign
            </Link>
          </div>
        </MotionSection>
      </section>
    </div>
  );
}
