import { getPublicSocialLinks } from "@/lib/public-links";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M13.5 21v-7h2.3l.4-3h-2.7V9.1c0-.9.3-1.6 1.6-1.6H16V4.8c-.4-.1-1.2-.2-2.2-.2-2.2 0-3.8 1.3-3.8 4V11H7.5v3H10v7h3.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3Zm0 1.8A3 3 0 0 0 4.8 7.8v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8Zm8.7 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 1.8A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M18.9 3H21l-6.88 7.86L22 21h-6.18l-4.84-6.33L5.44 21H3.33l7.36-8.42L2 3h6.34l4.37 5.76L18.9 3Zm-1.08 16.2h1.16L7.7 4.7H6.46L17.82 19.2Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M21.6 7.2a2.98 2.98 0 0 0-2.1-2.1C17.7 4.5 12 4.5 12 4.5s-5.7 0-7.5.6a2.98 2.98 0 0 0-2.1 2.1C1.8 9 1.8 12 1.8 12s0 3 .6 4.8a2.98 2.98 0 0 0 2.1 2.1c1.8.6 7.5.6 7.5.6s5.7 0 7.5-.6a2.98 2.98 0 0 0 2.1-2.1c.6-1.8.6-4.8.6-4.8s0-3-.6-4.8ZM9.75 15.3V8.7L15.45 12l-5.7 3.3Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M19.54 5.25A16.6 16.6 0 0 0 15.6 4l-.19.38a15.2 15.2 0 0 1 3.67 1.15 12.1 12.1 0 0 0-3.73-1.03c-.48.66-.74 1.24-.89 1.65a14.4 14.4 0 0 0-4.92 0c-.15-.41-.43-.99-.9-1.65a12.1 12.1 0 0 0-3.73 1.03A15.2 15.2 0 0 1 8.58 4.38L8.39 4a16.6 16.6 0 0 0-3.94 1.25C1.95 9.01 1.3 12.65 1.62 16.25A16.8 16.8 0 0 0 6.3 18.6l.56-.9a10.9 10.9 0 0 1-1.76-.85l.43-.33c3.4 1.6 7.08 1.6 10.44 0l.43.33c-.55.32-1.14.6-1.76.85l.56.9a16.8 16.8 0 0 0 4.68-2.35c.37-4.17-.63-7.78-2.34-11Zm-8.08 8.8c-.86 0-1.56-.78-1.56-1.74s.69-1.74 1.56-1.74c.88 0 1.57.79 1.56 1.74 0 .96-.69 1.74-1.56 1.74Zm5.08 0c-.86 0-1.56-.78-1.56-1.74s.69-1.74 1.56-1.74c.88 0 1.57.79 1.56 1.74 0 .96-.68 1.74-1.56 1.74Z" />
    </svg>
  );
}

const iconMap = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  x: XIcon,
  youtube: YouTubeIcon,
  discord: DiscordIcon,
};

const accentMap: Record<keyof typeof iconMap, string> = {
  facebook:
    "border-sky-400/25 bg-sky-500/[0.08] text-sky-700 hover:bg-sky-500/[0.14] dark:text-sky-200",
  instagram:
    "border-pink-400/25 bg-pink-500/[0.08] text-pink-700 hover:bg-pink-500/[0.14] dark:text-pink-200",
  x: "border-foreground/15 bg-foreground/[0.05] text-foreground/80 hover:bg-foreground/[0.1] dark:text-foreground",
  youtube:
    "border-rose-400/25 bg-rose-500/[0.08] text-rose-700 hover:bg-rose-500/[0.14] dark:text-rose-200",
  discord:
    "border-violet-400/25 bg-violet-500/[0.08] text-violet-700 hover:bg-violet-500/[0.14] dark:text-violet-200",
};

type PublicSocialLinksProps = {
  title?: string;
  description?: string;
  iconOnly?: boolean;
  className?: string;
};

export default function PublicSocialLinks({
  title,
  description,
  iconOnly = false,
  className = "",
}: PublicSocialLinksProps) {
  const links = getPublicSocialLinks();
  const items = [
    { key: "facebook", label: "Facebook", href: links.facebook },
    { key: "instagram", label: "Instagram", href: links.instagram },
    { key: "x", label: "X", href: links.x },
    { key: "youtube", label: "YouTube", href: links.youtube },
    { key: "discord", label: "Discord", href: links.discord },
  ].filter((item) => item.href) as Array<{ key: keyof typeof iconMap; label: string; href: string }>;

  if (!items.length) return null;

  return (
    <div className={className}>
      {title ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">{title}</p> : null}
      {description ? <p className="mt-2 text-sm text-foreground/60">{description}</p> : null}
      <div className={`mt-3 flex flex-wrap gap-3 ${iconOnly ? "" : ""}`}>
        {items.map((item, index) => {
          const Icon = iconMap[item.key];
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              title={item.label}
              style={{ animationDelay: `${index * 55}ms` }}
              className={`public-social-chip public-float-enter inline-flex items-center justify-center rounded-full border transition hover:-translate-y-0.5 ${
                iconOnly ? "h-11 w-11" : "gap-2 px-4 py-2 text-sm"
              } ${accentMap[item.key]} ${
                iconOnly ? "" : "pr-4"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center rounded-full ${
                  iconOnly ? "h-11 w-11" : "h-8 w-8"
                } bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-black/25`}
              >
                <Icon />
              </span>
              {iconOnly ? null : <span>{item.label}</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}
