import crypto from "node:crypto";

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || "";
}

function getTelegramLinkSecret() {
  return process.env.TELEGRAM_LINK_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function signTelegramPayload(payload: string) {
  // Telegram deep links have a strict `start` payload length limit (64 chars).
  // Use a compact token format: `${userId}.${exp36}.${sigHex}` where sig is a short hex HMAC.
  return crypto.createHmac("sha256", getTelegramLinkSecret()).update(payload).digest("hex").slice(0, 24);
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken() && getTelegramBotUsername() && getTelegramLinkSecret());
}

export function createTelegramLinkToken(userId: string) {
  const expiresAtMs = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const exp36 = expiresAtMs.toString(36);
  const payload = `${userId}.${exp36}`;
  const sig = signTelegramPayload(payload);
  return `${payload}.${sig}`;
}

export function verifyTelegramLinkToken(token: string) {
  const [userId, exp36, sig] = token.split(".");
  if (!userId || !exp36 || !sig) {
    return null;
  }

  const payload = `${userId}.${exp36}`;
  const expected = signTelegramPayload(payload);
  if (expected !== sig) {
    return null;
  }

  const expiresAt = Number.parseInt(exp36, 36);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  return { userId, expiresAt };
}

export function getTelegramDeepLink(userId: string) {
  if (!isTelegramConfigured()) {
    return null;
  }

  const username = getTelegramBotUsername();
  const token = createTelegramLinkToken(userId);
  return `https://t.me/${username}?start=${token}`;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    throw new Error("Telegram bot token not configured");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText.slice(0, 300)}`);
  }

  return response.json();
}
