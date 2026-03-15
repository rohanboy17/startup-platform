"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import { useTranslations } from "next-intl";

export default function WithdrawRequestCard({
  minAmount,
  availableBalance,
  emergencyRemaining,
}: {
  minAmount: number;
  availableBalance?: number;
  emergencyRemaining?: number;
}) {
  const t = useTranslations("user.withdrawRequest");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestWithdrawal() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        amount: Number(amount),
        upiId,
        upiName,
      }),
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      data = { error: t("unexpected") };
    }

    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || t("failed"));
      return;
    }

    setMessage(data.message || t("created"));
    setAmount("");
    setUpiId("");
    setUpiName("");
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">{t("title")}</h3>
      <p className="text-sm text-white/60">
        {t("min", { amount: formatMoney(minAmount) })}
      </p>
      {typeof availableBalance === "number" ? (
        <p className="text-sm text-white/60">
          {t("available", { amount: formatMoney(availableBalance) })}
        </p>
      ) : null}
      <p className="text-sm text-white/60">
        {t("emergencyLeft", { count: emergencyRemaining ?? 0 })}
      </p>
      <Input
        type="number"
        min={1}
        placeholder={t("amountPlaceholder", { amount: formatMoney(minAmount) })}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="min-h-11"
      />
      <Input
        placeholder={t("upiIdPlaceholder")}
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        className="min-h-11"
      />
      <Input
        placeholder={t("upiNamePlaceholder")}
        value={upiName}
        onChange={(e) => setUpiName(e.target.value)}
        className="min-h-11"
      />
      <Button onClick={requestWithdrawal} disabled={loading} className="w-full">
        {loading ? t("submitting") : t("submit")}
      </Button>
      <p className="text-xs text-white/45">
        {t("helper", { amount: formatMoney(minAmount) })}
      </p>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
