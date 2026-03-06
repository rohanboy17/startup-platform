"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

export default function SubmitCampaignModal({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!proof.trim()) {
      setMessage("Proof is required");
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
      data = { error: "Unexpected server response" };
    }

    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Error");
      return;
    }

    setMessage("Submission sent for manager review.");
    setProof("");
    setOpen(false);
    emitDashboardLiveRefresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-white text-black hover:bg-white">
        Submit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Submit Campaign Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Paste proof link or details..."
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit"}
            </Button>
            {message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
