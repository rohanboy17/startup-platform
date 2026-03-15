import { getTranslations } from "next-intl/server";

export default async function UserHelpPage() {
  const t = await getTranslations("user.help");
  const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 200);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">{t("approvalEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{t("approvalTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>{t("approvalStep1")}</li>
            <li>{t("approvalStep2")}</li>
            <li>{t("approvalStep3")}</li>
            <li>{t("approvalStep4")}</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">{t("levelsEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{t("levelsTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>{t("levelsBullet1")}</li>
            <li>{t("levelsBullet2")}</li>
            <li>{t("levelsBullet3")}</li>
            <li>{t("levelsBullet4")}</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">{t("fraudEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{t("fraudTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>{t("fraudBullet1")}</li>
            <li>{t("fraudBullet2")}</li>
            <li>{t("fraudBullet3")}</li>
            <li>{t("fraudBullet4")}</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
          <p className="text-sm text-white/60">{t("withdrawalsEyebrow")}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{t("withdrawalsTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>{t("withdrawalsBullet1", { amount: minWithdrawal.toFixed(2) })}</li>
            <li>{t("withdrawalsBullet2")}</li>
            <li>{t("withdrawalsBullet3")}</li>
            <li>{t("withdrawalsBullet4")}</li>
          </ul>
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6">
        <p className="text-sm text-white/60">{t("supportEyebrow")}</p>
        <h3 className="mt-2 text-xl font-semibold text-white">{t("supportTitle")}</h3>
        <p className="mt-4 text-sm text-white/70">
          {t("supportBody")}
        </p>
      </section>
    </div>
  );
}
