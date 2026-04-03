"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Film, PlayCircle, Sparkles, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";

type EarnAdsResponse = {
  settings: {
    perkCreditsPerAd: number;
    maxAdsPerDay: number;
    cooldownSeconds: number;
    watchSeconds: number;
  };
  summary: {
    availableAdsToday: number;
    adsWatchedToday: number;
    remainingAds: number;
    perkCreditsPerAd: number;
  };
  perks: {
    balance: number;
    recommendationBoostCost: number;
    recommendationBoostHours: number;
    recommendationBoostActive: boolean;
    recommendationBoostEndsAt: string | null;
  };
  cooldownLeftSeconds: number;
  cooldownEndsAt: string | null;
  canStart: boolean;
  activeSession: {
    id: string;
    perkCredits: number;
    status: "PENDING";
    startedAt: string;
    expiresAt: string;
    watchedSeconds: number;
    requiredSeconds: number;
    remainingSeconds: number;
    progressPercent: number;
  } | null;
  recentPerkActivity: Array<{
    id: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    source: string;
    note: string | null;
    createdAt: string;
  }>;
  error?: string;
};

function resolveIntlLocale(locale: string) {
  if (locale === "hi") return "hi-IN";
  if (locale === "bn") return "bn-IN";
  return "en-IN";
}

function getPageActiveState() {
  if (typeof document === "undefined" || typeof window === "undefined") return true;
  return !document.hidden && document.hasFocus();
}

export default function UserEarnAdsPanel() {
  const t = useTranslations("user.earnAds");
  const locale = useLocale();
  const [data, setData] = useState<EarnAdsResponse | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadingAction, setLoadingAction] = useState<"start" | "complete" | "boost" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [pageActive, setPageActive] = useState(getPageActiveState);
  const expiringSessionIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/earn-ads", { credentials: "include" });
    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as EarnAdsResponse) : null;

    if (!res.ok || !parsed) {
      setError(parsed?.error || t("errors.failed"));
      return;
    }

    setError("");
    setData(parsed);
    if (parsed.activeSession) {
      setModalOpen(true);
    }
  }, [t]);

  useLiveRefresh(load, 10000);

  useEffect(() => {
    const updatePageState = () => setPageActive(getPageActiveState());
    updatePageState();
    document.addEventListener("visibilitychange", updatePageState);
    window.addEventListener("focus", updatePageState);
    window.addEventListener("blur", updatePageState);
    return () => {
      document.removeEventListener("visibilitychange", updatePageState);
      window.removeEventListener("focus", updatePageState);
      window.removeEventListener("blur", updatePageState);
    };
  }, []);

  useEffect(() => {
    if (!data?.cooldownEndsAt && !data?.perks.recommendationBoostEndsAt) return;
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.cooldownEndsAt, data?.perks.recommendationBoostEndsAt]);

  const cooldownLeft = useMemo(() => {
    if (!data?.cooldownEndsAt || data.activeSession) return 0;
    return Math.max(0, Math.ceil((new Date(data.cooldownEndsAt).getTime() - nowTs) / 1000));
  }, [data?.cooldownEndsAt, data?.activeSession, nowTs]);

  const boostSecondsLeft = useMemo(() => {
    if (!data?.perks.recommendationBoostEndsAt) return 0;
    return Math.max(0, Math.ceil((new Date(data.perks.recommendationBoostEndsAt).getTime() - nowTs) / 1000));
  }, [data?.perks.recommendationBoostEndsAt, nowTs]);

  const activeSecondsLeft = data?.activeSession?.remainingSeconds ?? 0;
  const adProgress = data?.activeSession?.progressPercent ?? 0;

  const heartbeat = useCallback(
    async (sessionId: string) => {
      const res = await fetch("/api/v2/users/me/earn-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "heartbeat", sessionId }),
      });
      const raw = await res.text();
      const parsed = raw
        ? (JSON.parse(raw) as { error?: string; payload?: EarnAdsResponse })
        : {};

      if (!res.ok) {
        setFeedback(parsed.error || t("errors.heartbeat"));
        if (parsed.payload) {
          setData(parsed.payload);
        }
        return;
      }

      if (parsed.payload) {
        setData(parsed.payload);
      }
    },
    [t]
  );

  const completeAd = useCallback(
    async (sessionId: string) => {
      setLoadingAction("complete");
      const res = await fetch("/api/v2/users/me/earn-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "complete", sessionId }),
      });
      const raw = await res.text();
      const parsed = raw
        ? (JSON.parse(raw) as { error?: string; message?: string; payload?: EarnAdsResponse })
        : {};

      setLoadingAction(null);
      if (!res.ok) {
        setFeedback(parsed.error || t("errors.complete"));
        if (parsed.payload) {
          setData(parsed.payload);
        }
        return;
      }

      if (parsed.payload) {
        setData(parsed.payload);
      } else {
        await load();
      }
      setFeedback(parsed.message || t("messages.rewarded"));
      setModalOpen(false);
      emitDashboardLiveRefresh();
    },
    [load, t]
  );

  const activateBoost = useCallback(async () => {
    setLoadingAction("boost");
    setFeedback("");
    const res = await fetch("/api/v2/users/me/earn-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "activateBoost" }),
    });
    const raw = await res.text();
    const parsed = raw
      ? (JSON.parse(raw) as { error?: string; message?: string; payload?: EarnAdsResponse })
      : {};

    setLoadingAction(null);
    if (!res.ok) {
      setFeedback(parsed.error || t("errors.activateBoost"));
      if (parsed.payload) {
        setData(parsed.payload);
      }
      return;
    }

    if (parsed.payload) {
      setData(parsed.payload);
    } else {
      await load();
    }
    setFeedback(parsed.message || t("messages.boostActivated"));
    emitDashboardLiveRefresh();
  }, [load, t]);

  const expireActiveSession = useCallback(
    async (sessionId: string) => {
      if (expiringSessionIdRef.current === sessionId) return;
      expiringSessionIdRef.current = sessionId;
      setFeedback(t("messages.expiredOnHide"));
      setModalOpen(false);

      try {
        const res = await fetch("/api/v2/users/me/earn-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: JSON.stringify({ action: "expire", sessionId }),
        });
        const raw = await res.text();
        const parsed = raw
          ? (JSON.parse(raw) as { error?: string; message?: string; payload?: EarnAdsResponse })
          : {};

        if (parsed.payload) {
          setData(parsed.payload);
        } else if (res.ok) {
          await load();
        }

        if (!res.ok) {
          setFeedback(parsed.error || t("errors.expire"));
        }
      } catch {
        setFeedback(t("errors.expire"));
      }
    },
    [load, t]
  );

  useEffect(() => {
    if (!data?.activeSession) {
      expiringSessionIdRef.current = null;
    }
  }, [data?.activeSession]);

  useEffect(() => {
    if (!data?.activeSession || !pageActive || loadingAction === "complete") return;
    const sessionId = data.activeSession.id;
    const timer = window.setInterval(() => {
      void heartbeat(sessionId);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.activeSession, heartbeat, loadingAction, pageActive]);

  useEffect(() => {
    if (!data?.activeSession || activeSecondsLeft > 0 || loadingAction === "complete" || !pageActive) return;
    const sessionId = data.activeSession.id;
    const timer = window.setTimeout(() => {
      void completeAd(sessionId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeSecondsLeft, completeAd, data?.activeSession, loadingAction, pageActive]);

  useEffect(() => {
    if (!data?.activeSession || pageActive || loadingAction === "complete") return;
    const sessionId = data.activeSession.id;
    const timer = window.setTimeout(() => {
      void expireActiveSession(sessionId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data?.activeSession, expireActiveSession, loadingAction, pageActive]);

  async function startAd() {
    setLoadingAction("start");
    setFeedback("");
    const res = await fetch("/api/v2/users/me/earn-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "start" }),
    });
    const raw = await res.text();
    const parsed = raw
      ? (JSON.parse(raw) as { error?: string; message?: string; payload?: EarnAdsResponse })
      : {};

    setLoadingAction(null);
    if (!res.ok) {
      setFeedback(parsed.error || t("errors.start"));
      if (parsed.payload) {
        setData(parsed.payload);
      }
      return;
    }

    if (parsed.payload) {
      setData(parsed.payload);
      if (parsed.payload.activeSession) {
        setModalOpen(true);
      }
    } else {
      await load();
      setModalOpen(true);
    }
    setFeedback(parsed.message || t("messages.started"));
  }

  const buttonLabel = useMemo(() => {
    if (!data) return t("states.loading");
    if (data.activeSession) return pageActive ? t("states.playing") : t("states.paused");
    if (data.summary.remainingAds <= 0) return t("states.limitReached");
    if (cooldownLeft > 0) return t("states.wait", { seconds: cooldownLeft });
    return t("actions.watch");
  }, [cooldownLeft, data, pageActive, t]);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">{t("subtitle")}</p>
        </div>

        <Button
          type="button"
          onClick={() => void startAd()}
          disabled={!data.canStart || loadingAction !== null}
          className="w-full sm:w-auto"
        >
          <PlayCircle size={16} />
          {loadingAction === "start" ? t("actions.starting") : buttonLabel}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.availableAds")} value={data.summary.availableAdsToday} tone="info" />
        <KpiCard label={t("kpis.watchedToday")} value={data.summary.adsWatchedToday} tone="success" />
        <KpiCard label={t("kpis.remainingAds")} value={data.summary.remainingAds} tone="warning" />
        <KpiCard label={t("kpis.perkCreditsPerAd")} value={data.summary.perkCreditsPerAd} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-700 dark:text-emerald-200">
              <Film size={18} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground/60">{t("bonusEyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("bonusTitle")}</h3>
              <p className="text-sm text-foreground/70">{t("bonusBody")}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("rules.maxPerDay")}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data.settings.maxAdsPerDay}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("rules.cooldown")}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data.settings.cooldownSeconds}s</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("rules.watchTime")}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data.settings.watchSeconds}s</p>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("status.title")}</p>
                <p className="mt-1 text-sm text-foreground/65">
                  {data.activeSession
                    ? pageActive
                      ? t("status.playing", { seconds: activeSecondsLeft })
                      : t("status.expiring")
                    : data.summary.remainingAds <= 0
                      ? t("status.limitReached")
                      : cooldownLeft > 0
                        ? t("status.cooldown", { seconds: cooldownLeft })
                        : t("status.ready")}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1.5 text-sm text-foreground/75">
                <Clock3 size={15} />
                {data.activeSession
                  ? pageActive
                    ? t("status.adRunning")
                    : t("status.expiringBadge")
                  : t("status.remaining", { count: data.summary.remainingAds })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.08] p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sky-700 dark:text-sky-200">
                <Sparkles size={18} />
              </div>
              <div className="w-full space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">{t("perks.eyebrow")}</p>
                    <h3 className="text-xl font-semibold text-foreground">{t("perks.title")}</h3>
                    <p className="mt-1 text-sm text-foreground/70">{t("perks.body")}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-400/25 bg-background/70 px-4 py-3 sm:min-w-40">
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{t("perks.balance")}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{data.perks.balance}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/70">
                  <p className="font-medium text-foreground">{t("perks.boostTitle")}</p>
                  <p className="mt-1">{t("perks.boostBody", { hours: data.perks.recommendationBoostHours })}</p>
                  <p className="mt-2 text-xs text-foreground/60">
                    {data.perks.recommendationBoostActive && boostSecondsLeft > 0
                      ? t("perks.boostActive", {
                          date: new Date(data.perks.recommendationBoostEndsAt as string).toLocaleString(resolveIntlLocale(locale)),
                        })
                      : t("perks.boostInactive", { count: data.perks.recommendationBoostCost })}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void activateBoost()}
                  disabled={loadingAction !== null || data.perks.balance < data.perks.recommendationBoostCost}
                  className="w-full sm:w-auto"
                >
                  <Zap size={16} />
                  {loadingAction === "boost"
                    ? t("actions.activatingBoost")
                    : t("actions.activateBoost", { count: data.perks.recommendationBoostCost })}
                </Button>
              </div>
            </div>
          </div>

          {feedback ? <p className="text-sm text-emerald-700 dark:text-emerald-200">{feedback}</p> : null}
        </SectionCard>

        <SectionCard elevated className="space-y-5 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-700 dark:text-cyan-200">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm text-foreground/60">{t("historyEyebrow")}</p>
              <h3 className="text-xl font-semibold text-foreground">{t("historyTitle")}</h3>
            </div>
          </div>

          <div className="space-y-3">
            {data.recentPerkActivity.length ? (
              data.recentPerkActivity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.note || item.source}</p>
                      <p className="mt-1 text-xs text-foreground/60">
                        {new Date(item.createdAt).toLocaleString(resolveIntlLocale(locale))}
                      </p>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${
                        item.type === "CREDIT"
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200"
                          : "border-amber-400/25 bg-amber-400/10 text-amber-800 dark:text-amber-200"
                      }`}
                    >
                      {item.type === "CREDIT" ? "+" : "-"}
                      {item.amount}
                      <span>{t("history.creditsUnit")}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-background/40 px-4 py-6 text-sm text-foreground/60">
                {t("history.empty")}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <Dialog open={modalOpen && Boolean(data.activeSession)} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-foreground/10 bg-background/95">
          <DialogHeader>
            <DialogTitle>{t("modal.title")}</DialogTitle>
            <DialogDescription>{t("modal.body")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-foreground/70">
                <span>{t("modal.progressLabel")}</span>
                <span>{activeSecondsLeft}s</span>
              </div>
              <div className="h-3 rounded-full bg-foreground/10">
                <div className="h-3 rounded-full bg-emerald-400 transition-all" style={{ width: `${adProgress}%` }} />
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4 text-sm text-foreground/70">
              {!pageActive
                ? t("modal.expiring")
                : activeSecondsLeft > 0
                  ? t("modal.keepOpen", {
                      seconds: activeSecondsLeft,
                      count: data.activeSession?.perkCredits ?? data.summary.perkCreditsPerAd,
                    })
                  : t("modal.claiming")}
            </div>

            <Button type="button" disabled className="w-full">
              {loadingAction === "complete"
                ? t("actions.rewarding")
                : pageActive
                  ? t("states.playing")
                  : t("states.expiring")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
