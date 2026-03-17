"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Coins, Copy, Gift, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";

type ReferralsResponse = {
  settings: {
    referralRewardCoins: number;
    newUserBonusCoins: number;
    redeemMinCoins: number;
    redeemMonthlyLimit: number;
    coinToInrRate: number;
  };
  summary: {
    coinBalance: number;
    totalInvites: number;
    rewardedInvites: number;
    pendingInvites: number;
    monthlyRedeemedCoins: number;
  };
  referral: {
    code: string;
    link: string;
  };
  invites: Array<{
    id: string;
    status: "PENDING" | "QUALIFIED" | "REWARDED" | "REJECTED";
    createdAt: string;
    qualifiedAt: string | null;
    rewardedAt: string | null;
    referredUser: {
      id: string;
      name: string;
      createdAt: string;
    };
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    source: string;
    note: string | null;
    createdAt: string;
  }>;
  error?: string;
};

function statusTone(status: ReferralsResponse["invites"][number]["status"]) {
  if (status === "REWARDED") return "text-emerald-700 dark:text-emerald-300";
  if (status === "PENDING") return "text-amber-800 dark:text-amber-200";
  if (status === "REJECTED") return "text-rose-600 dark:text-rose-300";
  return "text-sky-700 dark:text-sky-200";
}

export default function UserReferralsPanel() {
  const t = useTranslations("user.referrals");
  const locale = useLocale();
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [redeemCoins, setRedeemCoins] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const lastQrLinkRef = useRef<string>("");
  const hydrated = useHydrated();

  const ensureQrForLink = useCallback(
    async (link: string) => {
      const trimmed = (link || "").trim();
      if (!trimmed) return;

      if (lastQrLinkRef.current === trimmed && qrDataUrl) return;

      lastQrLinkRef.current = trimmed;
      setQrLoading(true);
      setQrError("");

      try {
        const mod = (await import("qrcode")) as unknown as {
          toDataURL?: (text: string, opts?: Record<string, unknown>) => Promise<string>;
          default?: { toDataURL?: (text: string, opts?: Record<string, unknown>) => Promise<string> };
        };
        const api = mod.toDataURL ? mod : mod.default;
        if (!api?.toDataURL) throw new Error("QR library missing toDataURL");

        const url = await api.toDataURL(trimmed, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 320,
          color: { dark: "#0B0F1A", light: "#FFFFFF" },
        });
        setQrDataUrl(url);
      } catch {
        setQrError(t("qrFailed"));
      } finally {
        setQrLoading(false);
      }
    },
    [qrDataUrl, t]
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/referrals", { credentials: "include" });
    const raw = await res.text();
    let parsed: ReferralsResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as ReferralsResponse) : null;
    } catch {
      setError(t("unexpected"));
      return;
    }

    if (!parsed) {
      setError(t("unexpected"));
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || t("failed"));
      return;
    }

    setError("");
    setData(parsed);
    setQrError("");
    void ensureQrForLink(parsed.referral.link);
  }, [ensureQrForLink, t]);

  useLiveRefresh(load, 10000);

  const estimatedWalletValue = useMemo(() => {
    if (!data) return 0;
    return Number((data.summary.coinBalance * data.settings.coinToInrRate).toFixed(2));
  }, [data]);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(t("copy"));
    } catch {
      setFeedback(t("copyFail"));
    }
  }

  async function redeem() {
    const coins = Number(redeemCoins || 0);
    setLoading("redeem");
    setFeedback("");
    const res = await fetch("/api/v2/users/me/referrals/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ coins }),
    });
    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string; walletAmount?: number }) : {};
    setLoading(null);
    if (!res.ok) {
      setFeedback(parsed.error || t("redeemFailed"));
      return;
    }

    setRedeemCoins("");
    setFeedback(parsed.message || t("redeemed"));
    await load();
  }

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  function downloadQr(code: string) {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `earnhub-referral-${code}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label={t("kpiCoin")} value={data.summary.coinBalance} tone="info" />
        <KpiCard label={t("kpiEstimated")} value={`INR ${formatMoney(estimatedWalletValue)}`} tone="success" />
        <KpiCard label={t("kpiTotalInvites")} value={data.summary.totalInvites} />
        <KpiCard label={t("kpiRewardedInvites")} value={data.summary.rewardedInvites} tone="success" />
        <KpiCard label={t("kpiPendingInvites")} value={data.summary.pendingInvites} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-sm text-white/60">{t("shareEyebrow")}</p>
            <h3 className="text-xl font-semibold text-white">{t("shareTitle")}</h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("codeLabel")}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.referral.code}</p>
              <Button className="mt-4 w-full sm:w-auto" variant="outline" onClick={() => void copyText(data.referral.code)}>
                <Copy size={16} />
                {t("copyCode")}
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("linkLabel")}</p>
              <p className="mt-2 break-all text-sm text-white/75">{data.referral.link}</p>
              <Button className="mt-4 w-full sm:w-auto" variant="outline" onClick={() => void copyText(data.referral.link)}>
                <Gift size={16} />
                {t("copyLink")}
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("qrLabel")}</p>
              <div className="mt-3 flex justify-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={t("qrAlt")}
                    className="h-44 w-44 rounded-2xl bg-white p-3 shadow-lg shadow-black/30 sm:h-52 sm:w-52"
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/10 px-4 text-center text-sm text-white/60 sm:h-52 sm:w-52">
                    {qrLoading ? t("qrLoading") : qrError || t("qrHelp")}
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-white/55">{t("qrHelp")}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void ensureQrForLink(data.referral.link)}
                  disabled={qrLoading}
                  className="w-full sm:w-auto"
                >
                  {qrLoading ? t("qrLoading") : t("qrRegenerate")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadQr(data.referral.code)}
                  disabled={!qrDataUrl}
                  className="w-full sm:w-auto"
                >
                  {t("qrDownload")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("referrerReward")}</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.settings.referralRewardCoins} {t("coinsUnit")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("newUserBonus")}</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.settings.newUserBonusCoins} {t("coinsUnit")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t("rewardTrigger")}</p>
              <p className="mt-2 text-sm text-white/75">{t("rewardTriggerValue")}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-sm text-foreground/60">{t("redeemEyebrow")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("redeemTitle")}</h3>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-foreground">
              <Coins size={16} className="text-amber-700 dark:text-amber-200" />
              <p className="font-medium">{t("rules")}</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/70">
              <li>{t("minRedeem", { count: data.settings.redeemMinCoins })}</li>
              <li>{t("monthlyLimit", { count: data.settings.redeemMonthlyLimit })}</li>
              <li>{t("rate", { amount: data.settings.coinToInrRate.toFixed(2) })}</li>
              <li>{t("redeemedThisMonth", { count: data.summary.monthlyRedeemedCoins })}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <input
              value={redeemCoins}
              onChange={(e) => setRedeemCoins(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={t("redeemPlaceholder", { count: data.settings.redeemMinCoins })}
              className="h-11 w-full rounded-xl border border-foreground/20 bg-background/60 px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Button onClick={redeem} disabled={loading !== null} className="w-full sm:w-auto">
              <Wallet size={16} />
              {loading === "redeem" ? t("redeeming") : t("redeem")}
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("historyEyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("historyTitle")}</h3>
            </div>

            {data.invites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/70">
                {t("noInvites")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.invites.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{item.referredUser.name}</p>
                      <span className={`text-xs font-medium uppercase tracking-[0.18em] ${statusTone(item.status)}`}>
                        {t(`status.${item.status}`)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/60" suppressHydrationWarning>
                      {t("joined", { date: hydrated ? new Date(item.createdAt).toLocaleDateString(locale) : "" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div>
              <p className="text-sm text-foreground/60">{t("coinActivityEyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("coinActivityTitle")}</h3>
            </div>

            {data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/70">
                {t("noCoinTx")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{item.note || item.source}</p>
                      <span className={item.type === "CREDIT" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}>
                        {item.type === "CREDIT" ? "+" : "-"}
                        {item.amount} coins
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/60" suppressHydrationWarning>
                      {hydrated ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {feedback ? <p className="text-sm text-foreground/70">{feedback}</p> : null}
    </div>
  );
}
