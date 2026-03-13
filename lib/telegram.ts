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
  return crypto.createHmac("sha256", getTelegramLinkSecret()).update(payload).digest("base64url");
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken() && getTelegramBotUsername() && getTelegramLinkSecret());
}

export function createTelegramLinkToken(userId: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = `${userId}:${expiresAt}`;
  const signature = signTelegramPayload(payload);
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function verifyTelegramLinkToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  let payload = "";
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  if (signTelegramPayload(payload) !== signature) {
    return null;
  }

  const [userId, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
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
