export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "rohanmondalpc@gmail.com";

export const SUPPORT_ADDRESS =
  process.env.NEXT_PUBLIC_SUPPORT_ADDRESS || "Kolkata, West Bengal, India";

function normalizeUrl(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getPublicSocialLinks() {
  return {
    facebook: normalizeUrl(process.env.NEXT_PUBLIC_FACEBOOK_URL),
    instagram: normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
    x: normalizeUrl(process.env.NEXT_PUBLIC_X_URL),
    youtube: normalizeUrl(process.env.NEXT_PUBLIC_YOUTUBE_URL),
    discord: normalizeUrl(process.env.NEXT_PUBLIC_DISCORD_URL),
  };
}

export function getPublicChannelLinks() {
  const whatsappDirect = normalizeUrl(process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL);
  const telegramDirect = normalizeUrl(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL);
  const telegramBot = process.env.TELEGRAM_BOT_USERNAME?.trim();

  return {
    whatsapp: whatsappDirect,
    telegram: telegramDirect || (telegramBot ? `https://t.me/${telegramBot}` : null),
  };
}
