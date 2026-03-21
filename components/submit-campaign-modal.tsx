"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function SubmitCampaignModal({ campaignId }: { campaignId: string }) {
  const t = useTranslations("common.submitCampaignModal");
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!proof.trim()) {
      setMessage(t("errors.proofRequired"));
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/v2/campaigns/${campaignId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ proofText: proof }),
    });

    const raw = await res.text();
    let data: { error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string }) : {};
    } catch {
      data = { error: t("errors.unexpected") };
    }

    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || t("errors.failed"));
      return;
    }

    setMessage(t("messages.sent"));
    setProof("");
    setOpen(false);
    emitDashboardLiveRefresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-white text-black hover:bg-white">
        {t("actions.open")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t("placeholder")}
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? t("actions.submitting") : t("actions.submit")}
            </Button>
            {message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
