"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, PlayCircle } from "lucide-react";
import { getTutorialVideoEmbed } from "@/lib/tutorial-video";

export default function CampaignTutorialVideo({
  videoUrl,
  eyebrow,
  title,
  body,
  openLabel,
}: {
  videoUrl: string | null | undefined;
  eyebrow: string;
  title: string;
  body: string;
  openLabel: string;
}) {
  const t = useTranslations("common.tutorialVideo");
  const embed = getTutorialVideoEmbed(videoUrl);
  if (!embed) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">{eyebrow}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-lg font-semibold text-white">{title}</h4>
          <a
            href={embed.openUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200 underline underline-offset-4 hover:text-emerald-100"
          >
            <ExternalLink size={16} />
            {openLabel}
          </a>
        </div>
        <p className="text-sm text-white/60">{body}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="aspect-video w-full">
          {embed.kind === "iframe" ? (
            <iframe
              src={embed.src}
              title={title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <video
              src={embed.src}
              controls
              preload="metadata"
              className="h-full w-full bg-black object-contain"
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/50">
        <PlayCircle size={14} />
        <span>
          {embed.provider === "youtube"
            ? t("youtube")
            : embed.provider === "loom"
              ? t("loom")
              : t("hosted")}
        </span>
      </div>
    </div>
  );
}
