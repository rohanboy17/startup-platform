"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SubmitTaskModal({
  taskId,
}: {
  taskId: string;
}) {
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

    const res = await fetch(`/api/tasks/${taskId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ proof }),
    });

    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Error");
      return;
    }

    setMessage("Submission successful!");
    setProof("");
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-white text-black transition hover:scale-105 hover:bg-white"
      >
        Submit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Submit Task Proof</DialogTitle>
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

            {message && (
              <p className="text-muted-foreground text-center text-sm">{message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
