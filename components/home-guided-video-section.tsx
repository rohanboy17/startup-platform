"use client";

import { useMemo, useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { getTutorialVideoEmbed } from "@/lib/tutorial-video";

type GuidedVideoItem = {
  id: string;
  tabLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  videoUrl: string | null;
  bullets: string[];
};

export default function HomeGuidedVideoSection({
  items,
  openLabel,
  fallbackLabel,
}: {
  items: GuidedVideoItem[];
  openLabel: string;
  fallbackLabel: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0],
    [activeId, items]
  );

  const embed = getTutorialVideoEmbed(activeItem?.videoUrl);

  if (!activeItem) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-stretch">
      <div className="space-y-5 rounded-3xl border border-foreground/10 bg-foreground/5 p-6 sm:p-7">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500/80 dark:text-emerald-300/70">
            {activeItem.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold sm:text-3xl">{activeItem.title}</h2>
          <p className="text-sm leading-6 text-foreground/70 sm:text-base">{activeItem.body}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {items.map((item) => {
            const active = item.id === activeItem.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-emerald-400/30 bg-emerald-500/10 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.45)]"
                    : "border-foreground/10 bg-background/40 hover:bg-foreground/[0.06]"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{item.tabLabel}</p>
                <p className="mt-1 text-xs text-foreground/60">{item.eyebrow}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4">
          <ul className="space-y-3 text-sm text-foreground/70">
            {activeItem.bullets.map((bullet, index) => (
              <li key={`${activeItem.id}-${index}`} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-foreground/10 bg-foreground/5 p-4 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.28)] sm:p-5">
        <div className="overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-background/80">
          <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-medium text-foreground">{activeItem.tabLabel}</p>
              <p className="text-xs text-foreground/55">{activeItem.eyebrow}</p>
            </div>
            {embed ? (
              <a
                href={embed.openUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-xs font-medium text-foreground/80 transition hover:bg-foreground/10"
              >
                <ExternalLink size={14} />
                {openLabel}
              </a>
            ) : null}
          </div>

          <div className="aspect-video w-full bg-background/70">
            {embed ? (
              embed.kind === "iframe" ? (
                <iframe
                  src={embed.src}
                  title={activeItem.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <video src={embed.src} controls preload="metadata" className="h-full w-full bg-black object-contain" />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <PlayCircle size={42} className="text-emerald-500" />
                <p className="text-base font-semibold text-foreground">{fallbackLabel}</p>
                <p className="max-w-xl text-sm text-foreground/65">{activeItem.body}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
