import AdminCmsPanel from "@/components/admin-cms-panel";
import { prisma } from "@/lib/prisma";
import { getCmsValue } from "@/lib/cms";

const DEFAULT_FLAGS: Array<{ key: string; enabled: boolean; description: string }> = [
  {
    key: "home.announcements",
    enabled: true,
    description: "Show public announcement strip on homepage",
  },
  {
    key: "home.stats",
    enabled: true,
    description: "Show stats cards in homepage hero section",
  },
  {
    key: "home.features",
    enabled: true,
    description: "Show feature highlight cards on homepage",
  },
  {
    key: "home.liveActivity",
    enabled: true,
    description: "Show live activity section on homepage",
  },
];

export default async function AdminCmsPage() {
  await Promise.all(
    DEFAULT_FLAGS.map((flag) =>
      prisma.featureFlag.upsert({
        where: { key: flag.key },
        update: {},
        create: flag,
      })
    )
  );

  const [landing, terms, privacy, refund, faq, flags, announcements] = await Promise.all([
    getCmsValue<{ heroTitle: string; heroSubtitle: string }>("landing.home", {
      heroTitle: "Run campaigns. Reward real users. Grow with confidence.",
      heroSubtitle:
        "FreeEarnHub helps people earn from verified tasks while businesses grow through simple, trackable campaigns.",
    }),
    getCmsValue<{ body: string }>("legal.terms", { body: "" }),
    getCmsValue<{ body: string }>("legal.privacy", { body: "" }),
    getCmsValue<{ body: string }>("legal.refund", { body: "" }),
    getCmsValue<{ body: string }>("legal.faq", { body: "" }),
    prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Content & CMS</h1>
      <p className="text-sm text-white/70">
        Control landing text, legal pages, announcement banners, and feature flags from one place.
      </p>
      <AdminCmsPanel
        initialLandingHero={landing.heroTitle}
        initialLandingSubtitle={landing.heroSubtitle}
        initialTermsBody={terms.body}
        initialPrivacyBody={privacy.body}
        initialRefundBody={refund.body}
        initialFaqBody={faq.body}
        flags={flags}
        announcements={announcements}
      />
    </div>
  );
}

