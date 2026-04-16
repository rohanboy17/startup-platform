import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { ArrowRight, ShieldCheck, Zap, TrendingUp, Users, Briefcase, Timer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import HomeLiveSection from "@/components/home-live-section";
import MotionSection from "@/components/motion-section";
import HomeHeroText from "@/components/home-hero-text";
import HomeParallaxOrbs from "@/components/home-parallax-orbs";
import { MotionItem } from "@/components/motion-stagger";
import { getFeatureFlag } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import HomeLiveFloatsAndStats from "@/components/home-live-floats-and-stats";
import HomeLiveHeroVisual from "@/components/home-live-hero-visual";
import MobileCarouselShell from "@/components/mobile-carousel-shell";
import PwaInstallNudge from "@/components/pwa-install-nudge";
import HomeGuidedVideoSection from "@/components/home-guided-video-section";
import HomeTestimonialsSection from "@/components/home-testimonials-section";
import PublicChannelLinks from "@/components/public-channel-links";
import { auth } from "@/lib/auth";
import HomeFeedbackSubmitCard from "@/components/home-feedback-submit-card";

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
  const tHome = await getTranslations("home");
  const session = await auth();

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "https://startup-platform-eight.vercel.app";
  const now = new Date();
  const [
    showAnnouncements,
    showStats,
    showFeatures,
    showLiveActivity,
    announcements,
    totalPayout,
    totalUsers,
    businessAccounts,
    totalCampaigns,
    tasksCompleted,
    totalJobs,
    totalJobApplications,
    activeHiring,
    approvalLogs,
    approvedCommunityFeedback,
    currentUserFeedback,
  ] = await Promise.all([
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
    prisma.campaign.count(),
    prisma.submission.count({
      where: { adminStatus: { in: ["ADMIN_APPROVED", "APPROVED"] } },
    }),
    prisma.jobPosting.count(),
    prisma.jobApplication.count(),
    prisma.jobApplication.count({
      where: {
        status: { in: ["SHORTLISTED", "INTERVIEW_SCHEDULED", "HIRED"] },
      },
    }),
    prisma.activityLog.findMany({
      where: { action: "ADMIN_APPROVED_SUBMISSION" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { createdAt: true, details: true },
    }),
    prisma.communityFeedback.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        quote: true,
        displayName: true,
        roleLabel: true,
      },
    }),
    session?.user.id
      ? prisma.communityFeedback.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            quote: true,
            createdAt: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const heroTitle = tHome("landing.heroTitle");
  const heroSubtitle = tHome("landing.heroSubtitle");
  const howItWorksSteps = tHome.raw("sections.howItWorksSteps") as string[];
  const forBusinessesSteps = tHome.raw("sections.forBusinessesSteps") as string[];
  const guidedVideos = tHome.raw("guidedVideos.items") as Array<{
    id: string;
    tabLabel: string;
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
  }>;
  const fallbackTestimonials = tHome.raw("testimonials.items") as Array<{
    quote: string;
    name: string;
    role: string;
  }>;
  const testimonials = [
    ...approvedCommunityFeedback.map((item) => ({
      quote: item.quote,
      name: item.displayName,
      role: item.roleLabel,
    })),
    ...fallbackTestimonials,
  ].slice(0, 6);

  // Avoid rendering duplicate active announcements (common during admin testing).
  const uniqueAnnouncements = (() => {
    const seen = new Set<string>();
    const out: typeof announcements = [];
    for (const item of announcements) {
      const signature = `${item.title}||${item.message}||${item.link || ""}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      out.push(item);
    }
    return out;
  })();

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
  const qrCodeDataUrl = await QRCode.toDataURL(siteUrl, {
    width: 320,
    margin: 1,
    color: {
      dark: "#020617",
      light: "#ffffff",
    },
  });
  const heroMetrics = {
    totalPayout: Math.round(totalPayout._sum.amount || 0),
    totalUsers,
    businessAccounts,
    totalCampaigns,
    tasksCompleted,
    totalJobs,
    totalJobApplications,
    activeHiring,
  };
  const homeEarnVideoUrl = process.env.NEXT_PUBLIC_HOME_EARNING_VIDEO_URL || null;
  const homeCampaignVideoUrl = process.env.NEXT_PUBLIC_HOME_CAMPAIGN_VIDEO_URL || null;
  const homeJobsVideoUrl = process.env.NEXT_PUBLIC_HOME_JOBS_VIDEO_URL || null;
  const featureCards = [
    {
      title: tHome("features.items.0.title"),
      body: tHome("features.items.0.body"),
      image: "/illustrations/home-cards/safe-payouts.svg",
      alt: "Illustration of protected payouts and tracked money flow",
      icon: ShieldCheck,
      iconClassName: "text-emerald-500",
    },
    {
      title: tHome("features.items.1.title"),
      body: tHome("features.items.1.body"),
      image: "/illustrations/home-cards/digital-work-local-hiring.svg",
      alt: "Illustration of digital work and local hiring from one platform",
      icon: Zap,
      iconClassName: "text-sky-500",
    },
    {
      title: tHome("features.items.2.title"),
      body: tHome("features.items.2.body"),
      image: "/illustrations/home-cards/performance-tracking.svg",
      alt: "Illustration of performance tracking across approvals, applicants, and spending",
      icon: TrendingUp,
      iconClassName: "text-violet-500",
    },
  ];
  const trustCards = [
    {
      title: tHome("trust.items.0.title"),
      body: tHome("trust.items.0.body"),
      image: "/illustrations/home-cards/real-users-real-work.svg",
      alt: "Illustration of verified users and moderated work activity",
      icon: Users,
      iconClassName: "text-emerald-500",
    },
    {
      title: tHome("trust.items.1.title"),
      body: tHome("trust.items.1.body"),
      image: "/illustrations/home-cards/transparent-costs.svg",
      alt: "Illustration of transparent costs and commission breakdowns",
      icon: Briefcase,
      iconClassName: "text-sky-500",
    },
    {
      title: tHome("trust.items.2.title"),
      body: tHome("trust.items.2.body", { time: avgApprovalTimeLabel }),
      image: "/illustrations/home-cards/reliable-approvals.svg",
      alt: "Illustration of reliable approvals and clear review timing",
      icon: Timer,
      iconClassName: "text-violet-500",
    },
  ];
  const platformCards = [...(showFeatures ? featureCards : []), ...trustCards];

  return (
    <div className="home-shell relative min-h-screen overflow-x-clip bg-background text-foreground">
      <PwaInstallNudge />
      <PublicChannelLinks
        floating
        whatsappLabel={tHome("channels.whatsapp")}
        telegramLabel={tHome("channels.telegram")}
      />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.22),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="bg-grid" />
      </div>
      <HomeParallaxOrbs />

      {showAnnouncements && uniqueAnnouncements.length > 0 ? (
        <section className="relative mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground/80 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
              {uniqueAnnouncements.map((item) => (
                <div key={item.id} className="flex min-w-0 items-start gap-2 sm:items-center">
                  <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400/90 sm:mt-0" />
                  <p className="min-w-0 break-words">
                    <span className="font-semibold text-foreground">{item.title}</span>
                    <span className="text-foreground/60">: </span>
                    <span className="text-foreground/80">{item.message}</span>
                    {item.link ? (
                      <Link
                        href={item.link}
                        className="ml-2 inline-flex items-center rounded-md border border-foreground/10 bg-background/40 px-2 py-0.5 text-xs font-semibold text-foreground/80 transition hover:bg-foreground/10 hover:text-foreground"
                        target={item.link.startsWith("http") ? "_blank" : undefined}
                        rel={item.link.startsWith("http") ? "noreferrer noopener" : undefined}
                      >
                        {tHome("announcements.learnMore")}
                      </Link>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative mx-auto grid w-full max-w-screen-2xl items-stretch gap-7 px-4 pb-14 pt-6 sm:gap-9 sm:px-6 sm:pb-[4.5rem] sm:pt-12 lg:grid-cols-[1.22fr_0.78fr]">
        <MotionSection className="flex min-w-0 flex-col lg:h-full">
          <HomeHeroText
            title={heroTitle}
            subtitle={heroSubtitle}
            avgApprovalTimeLabel={avgApprovalTimeLabel}
          />
          <HomeLiveFloatsAndStats initial={heroMetrics} showStats={showStats} />
        </MotionSection>

        <div className="mx-auto flex h-full w-full max-w-full min-w-0 flex-col gap-5">
          <HomeLiveHeroVisual initial={heroMetrics} />
          {showLiveActivity ? (
            <section id="live-activity" className="home-anchor-target flex-1">
              <HomeLiveSection />
            </section>
          ) : null}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-screen-2xl px-4 pb-10 sm:px-6 sm:pb-16">
        <MotionSection>
          <HomeGuidedVideoSection
            items={guidedVideos.map((item) => ({
              ...item,
              videoUrl:
                item.id === "earn"
                  ? homeEarnVideoUrl
                  : item.id === "jobs"
                    ? homeJobsVideoUrl
                    : homeCampaignVideoUrl,
            }))}
            openLabel={tHome("guidedVideos.openLabel")}
            fallbackLabel={tHome("guidedVideos.fallbackLabel")}
          />
        </MotionSection>
      </section>

      <section id="how-it-works" className="home-anchor-target relative mx-auto w-full max-w-screen-2xl px-4 pb-10 sm:px-6 sm:pb-16">
        <div className="mb-6 max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500/80 dark:text-sky-300/70">
            {tHome("workflowSection.eyebrow")}
          </p>
          <h2 className="text-2xl font-semibold sm:text-3xl">{tHome("workflowSection.title")}</h2>
          <p className="text-sm leading-6 text-foreground/70 sm:text-base">
            {tHome("workflowSection.subtitle")}
          </p>
        </div>
        <MobileCarouselShell className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 no-scrollbar md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-2">
          <MotionItem className="relative min-w-[86%] max-w-[24rem] snap-start overflow-hidden rounded-[2rem] border border-foreground/10 bg-background/70 p-6 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.18)] sm:max-w-[28rem] sm:p-8 md:min-w-0 md:max-w-none">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/70 to-sky-400/0" />
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-foreground/60">{tHome("sections.howItWorksEyebrow")}</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">{tHome("sections.howItWorksTitle")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-foreground/65 sm:text-base">
                {tHome("sections.howItWorksIntro")}
              </p>
              <ul className="space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  {howItWorksSteps[0]}
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                  {howItWorksSteps[1]}
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                  {howItWorksSteps[2]}
                </li>
              </ul>
            </div>
          </MotionItem>
          <MotionItem className="relative min-w-[86%] max-w-[24rem] snap-start overflow-hidden rounded-[2rem] border border-foreground/10 bg-background/70 p-6 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.18)] sm:max-w-[28rem] sm:p-8 md:min-w-0 md:max-w-none">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-sky-400/0 via-sky-400/70 to-violet-400/0" />
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-foreground/60">{tHome("sections.forBusinessesEyebrow")}</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">{tHome("sections.forBusinessesTitle")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-foreground/65 sm:text-base">
                {tHome("sections.forBusinessesIntro")}
              </p>
              <ul className="space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  {forBusinessesSteps[0]}
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                  {forBusinessesSteps[1]}
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                  {forBusinessesSteps[2]}
                </li>
              </ul>
            </div>
          </MotionItem>
        </MobileCarouselShell>
      </section>

      {platformCards.length > 0 ? (
        <section id="trust" className="home-anchor-target relative mx-auto w-full max-w-screen-2xl px-4 pb-10 sm:px-6 sm:pb-16">
          <div className="mb-6 max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500/80 dark:text-emerald-300/70">
              {tHome("platformCards.eyebrow")}
            </p>
            <h2 className="text-2xl font-semibold sm:text-3xl">{tHome("platformCards.title")}</h2>
            <p className="text-sm leading-6 text-foreground/70 sm:text-base">
              {tHome("platformCards.subtitle")}
            </p>
          </div>

          <MobileCarouselShell className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 no-scrollbar md:mx-0 md:grid md:auto-rows-fr md:overflow-visible md:px-0 md:pb-0 md:grid-cols-3 md:gap-6">
            {platformCards.map((item) => {
              const Icon = item.icon;
              return (
                <MotionItem
                  key={item.title}
                  className="group flex h-full min-w-[86%] max-w-[22rem] snap-start flex-col overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-background/72 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.22)] md:min-w-0 md:max-w-none"
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-foreground/10 bg-foreground/[0.04]">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-background/80 shadow-lg backdrop-blur-md">
                      <Icon className={item.iconClassName} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="min-h-[3.5rem] line-clamp-2 text-xl font-semibold md:min-h-0 md:line-clamp-none">{item.title}</h3>
                    <p className="mt-3 line-clamp-4 text-foreground/65 md:line-clamp-none">{item.body}</p>
                  </div>
                </MotionItem>
              );
            })}
          </MobileCarouselShell>
        </section>
      ) : null}

      <section className="relative mx-auto w-full max-w-screen-2xl px-4 pb-10 sm:px-6 sm:pb-16">
        <HomeTestimonialsSection
          eyebrow={tHome("testimonials.eyebrow")}
          title={tHome("testimonials.title")}
          subtitle={tHome("testimonials.subtitle")}
          items={testimonials}
          footer={
            <HomeFeedbackSubmitCard
              currentRole={
                session?.user.role === "USER" || session?.user.role === "BUSINESS"
                  ? session.user.role
                  : null
              }
              defaultDisplayName={
                session?.user.name?.trim() ||
                session?.user.email?.split("@")[0]?.trim() ||
                "FreeEarnHub member"
              }
              existingFeedback={
                currentUserFeedback
                  ? {
                      status: currentUserFeedback.status,
                      quote: currentUserFeedback.quote,
                      createdAt: currentUserFeedback.createdAt.toISOString(),
                    }
                  : null
              }
            />
          }
        />
      </section>

      <section className="relative mx-auto w-full max-w-screen-2xl px-4 pb-16 sm:px-6 sm:pb-20">
        <MotionSection className="relative overflow-hidden rounded-[2.25rem] border border-foreground/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.06)_55%,rgba(255,255,255,0.02))] p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_62%)] sm:block" />
          <div className="relative">
            <h2 className="text-2xl font-semibold">{tHome("cta.title")}</h2>
            <p className="mt-2 text-sm text-foreground/70">
              {tHome("cta.body")}
            </p>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:scale-105"
            >
              {tHome("hero.startEarning")} <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-foreground/25 px-5 py-2.5 text-sm text-foreground/90 transition hover:bg-foreground/10"
            >
              {tHome("hero.createCampaign")}
            </Link>
          </div>
        </MotionSection>
      </section>

      <section className="relative mx-auto w-full max-w-screen-2xl px-4 pb-16 sm:px-6 sm:pb-24">
        <MotionSection className="surface-card-elevated rounded-[2rem] p-5 text-foreground shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="space-y-5 lg:pr-6">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-500/80 dark:text-emerald-300/70">
                {tHome("offlineInvite.eyebrow")}
              </p>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {tHome("offlineInvite.title")}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-foreground/70 sm:text-base">
                {tHome("offlineInvite.body")}
              </p>
              <div className="flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-5 py-4 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.2)]">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  {tHome("offlineInvite.directLinkLabel")}
                </span>
                <span className="overflow-hidden text-ellipsis break-words text-sm font-semibold leading-7 text-foreground sm:text-base">
                  {siteUrl}
                </span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end lg:pl-6">
              <div className="w-full max-w-[320px] rounded-[2rem] border border-foreground/10 bg-foreground/[0.04] p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.24)]">
                <div className="rounded-[1.5rem] border border-foreground/10 bg-white p-4 dark:border-white/10">
                  <div className="mx-auto h-[240px] w-[240px] sm:h-[250px] sm:w-[250px]">
                    <Image
                      src={qrCodeDataUrl}
                      alt={tHome("offlineInvite.qrAlt")}
                      width={260}
                      height={260}
                      unoptimized
                      className="block h-full w-full rounded-xl bg-white object-contain"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground px-4 py-4 text-center text-background">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80 dark:text-emerald-300/80">
                    {tHome("offlineInvite.scanLabel")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-background sm:text-lg">
                    {tHome("offlineInvite.marketplaceLabel")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MotionSection>
      </section>
    </div>
  );
}

