"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type WalletAction = "CREDIT" | "DEBIT";

export default function AdminBusinessWalletActions({
  businessId,
}: {
  businessId: string;
}) {
  const t = useTranslations("admin.businessWalletActions");
  const router = useRouter();
  const [action, setAction] = useState<WalletAction>("CREDIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/businesses/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        businessId,
        action,
        amount: Number(amount),
        note,
      }),
    });

    const raw = await res.text();
    let data: { message?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    } catch {
      data = { error: t("unexpectedServerResponse") };
    }

    setLoading(false);
    setMessage(data.message || data.error || t("updated"));
    if (res.ok) {
      setAmount("");
      setNote("");
      router.refresh();
      emitDashboardLiveRefresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as WalletAction)}
          className="w-full rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground sm:w-auto"
          disabled={loading}
        >
          <option value="CREDIT">{t("actions.credit")}</option>
          <option value="DEBIT">{t("actions.debit")}</option>
        </select>
        <Input
          type="number"
          min={0.01}
          step="0.01"
          placeholder={t("amountPlaceholder")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full sm:max-w-[180px]"
        />
      </div>
      <Input
        placeholder={t("notePlaceholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button onClick={submit} disabled={loading} className="w-full sm:w-auto">
        {loading ? t("applying") : t("apply")}
      </Button>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
