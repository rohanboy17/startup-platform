import { getPublicChannelLinks } from "@/lib/public-links";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M20.52 3.48A11.9 11.9 0 0 0 12.06 0C5.54 0 .23 5.3.23 11.83c0 2.08.54 4.11 1.56 5.9L0 24l6.45-1.7a11.78 11.78 0 0 0 5.61 1.43h.01c6.52 0 11.83-5.3 11.83-11.83 0-3.16-1.23-6.13-3.38-8.42ZM12.06 21.7h-.01a9.8 9.8 0 0 1-4.99-1.36l-.36-.21-3.83 1 1.02-3.73-.24-.38a9.8 9.8 0 0 1-1.5-5.2c0-5.43 4.42-9.85 9.87-9.85 2.63 0 5.11 1.02 6.97 2.88a9.8 9.8 0 0 1 2.88 6.98c0 5.43-4.42 9.86-9.85 9.86Zm5.4-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.15-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.08c.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.71.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.43-.08-.12-.28-.2-.58-.35Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0Zm5.89 8.17-1.97 9.29c-.15.66-.54.82-1.1.51l-3.04-2.24-1.47 1.42c-.16.16-.3.3-.61.3l.22-3.12 5.68-5.13c.25-.22-.05-.35-.38-.13L8.2 13.49l-3.02-.94c-.66-.2-.67-.66.14-.98l11.8-4.55c.55-.2 1.02.13.84.98Z" />
    </svg>
  );
}

type PublicChannelLinksProps = {
  whatsappLabel: string;
  telegramLabel: string;
  floating?: boolean;
};

export default function PublicChannelLinks({
  whatsappLabel,
  telegramLabel,
  floating = false,
}: PublicChannelLinksProps) {
  const links = getPublicChannelLinks();
  const items = [
    {
      key: "whatsapp",
      href: links.whatsapp,
      label: whatsappLabel,
      icon: WhatsAppIcon,
      className:
        "border-emerald-400/30 bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:text-emerald-200",
    },
    {
      key: "telegram",
      href: links.telegram,
      label: telegramLabel,
      icon: TelegramIcon,
      className:
        "border-sky-400/30 bg-sky-500/12 text-sky-700 hover:bg-sky-500/18 dark:text-sky-200",
    },
  ].filter((item) => item.href) as Array<{
    key: string;
    href: string;
    label: string;
    icon: typeof WhatsAppIcon;
    className: string;
  }>;

  if (!items.length) return null;

  return (
    <div
      className={
        floating
          ? "fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6"
          : "flex flex-wrap gap-3"
      }
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            aria-label={item.label}
            title={item.label}
            style={floating ? { animationDelay: `${index * 90}ms` } : undefined}
            className={`inline-flex items-center gap-2 rounded-full border text-sm font-medium backdrop-blur-md transition hover:-translate-y-0.5 ${
              floating
                ? "public-float-enter group rounded-2xl px-3 py-3 shadow-[0_24px_50px_-24px_rgba(2,6,23,0.55)] sm:px-4"
                : "px-4 py-2 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)]"
            } ${item.className}`}
          >
            <span
              className={`inline-flex items-center justify-center rounded-full ${
                floating
                  ? "h-10 w-10 bg-white/85 text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-black/25"
                  : "h-8 w-8 bg-white/75 dark:bg-black/20"
              }`}
            >
              <Icon />
            </span>
            <span className={floating ? "hidden pr-1 sm:inline-block" : ""}>{item.label}</span>
          </a>
        );
      })}
    </div>
  );
}
