"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ProofImageDialog({
  url,
  label = "Preview screenshot",
  title = "Proof screenshot",
}: {
  url: string | null | undefined;
  label?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!url) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl overflow-auto rounded-2xl border-foreground/10 bg-background/95 p-0 shadow-2xl backdrop-blur">
          <DialogHeader className="border-b border-foreground/10 px-5 py-4">
            <DialogTitle className="text-base text-foreground">{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Proof screenshot"
                loading="lazy"
                className="block h-auto w-full rounded-xl bg-background object-contain"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all text-xs text-foreground/60">{url}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-200"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

