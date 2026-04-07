import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/ui/section-card";

export default async function UserHelpPage() {
  const t = await getTranslations("user.help");
  const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 200);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard elevated className="p-5 sm:p-6">
          <p className="text-sm text-foreground/60">{t("approvalEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("approvalTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li>{t("approvalStep1")}</li>
            <li>{t("approvalStep2")}</li>
            <li>{t("approvalStep3")}</li>
            <li>{t("approvalStep4")}</li>
          </ul>
        </SectionCard>

        <SectionCard elevated className="p-5 sm:p-6">
          <p className="text-sm text-foreground/60">{t("levelsEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("levelsTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li>{t("levelsBullet1")}</li>
            <li>{t("levelsBullet2")}</li>
            <li>{t("levelsBullet3")}</li>
            <li>{t("levelsBullet4")}</li>
          </ul>
        </SectionCard>

        <SectionCard elevated className="p-5 sm:p-6">
          <p className="text-sm text-foreground/60">{t("jobsEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("jobsTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li>{t("jobsBullet1")}</li>
            <li>{t("jobsBullet2")}</li>
            <li>{t("jobsBullet3")}</li>
            <li>{t("jobsBullet4")}</li>
          </ul>
        </SectionCard>

        <SectionCard elevated className="p-5 sm:p-6">
          <p className="text-sm text-foreground/60">{t("profileEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("profileTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li>{t("profileBullet1")}</li>
            <li>{t("profileBullet2")}</li>
            <li>{t("profileBullet3")}</li>
            <li>{t("profileBullet4")}</li>
          </ul>
        </SectionCard>

        <SectionCard elevated className="p-5 sm:p-6">
          <p className="text-sm text-foreground/60">{t("fraudEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("fraudTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li>{t("fraudBullet1")}</li>
            <li>{t("fraudBullet2")}</li>
            <li>{t("fraudBullet3")}</li>
            <li>{t("fraudBullet4")}</li>
          </ul>
        </SectionCard>

        <SectionCard elevated className="p-5 sm:p-6">
          <p className="text-sm text-foreground/60">{t("withdrawalsEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("withdrawalsTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li>{t("withdrawalsBullet1", { amount: minWithdrawal.toFixed(2) })}</li>
            <li>{t("withdrawalsBullet2")}</li>
            <li>{t("withdrawalsBullet3")}</li>
            <li>{t("withdrawalsBullet4")}</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard elevated className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-sm text-foreground/60">{t("supportEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{t("supportTitle")}</h3>
          <p className="mt-4 text-sm text-foreground/70">
            {t("supportBody")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/user/profile"
            className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-background/80"
          >
            {t("supportProfile")}
          </Link>
          <Link
            href="/dashboard/user/jobs"
            className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-background/80"
          >
            {t("supportJobs")}
          </Link>
          <Link
            href="/dashboard/user/job-applications"
            className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-background/80"
          >
            {t("supportApplications")}
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
