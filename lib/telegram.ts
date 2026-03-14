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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encodeUserId(userId: string) {
  // Telegram deep links have a strict `start` payload length limit (64 chars).
  // Our user ids are UUIDs (36 chars), so compress UUID -> 16 bytes -> base64url (22 chars).
  if (UUID_RE.test(userId)) {
    const bytes = Buffer.from(userId.replaceAll("-", ""), "hex");
    if (bytes.length === 16) return bytes.toString("base64url");
  }
  return userId;
}

function decodeUserId(encoded: string) {
  // Decode 16-byte base64url back to UUID.
  try {
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.length !== 16) return encoded;
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return encoded;
  }
}

function signTelegramPayload(payload: string) {
  // Keep signature short to fit Telegram's 64-char `start` payload limit.
  return crypto.createHmac("sha256", getTelegramLinkSecret()).update(payload).digest("base64url").slice(0, 16);
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken() && getTelegramBotUsername() && getTelegramLinkSecret());
}

export function createTelegramLinkToken(userId: string) {
  const expiresAtMs = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const exp36 = expiresAtMs.toString(36);
  const userIdEncoded = encodeUserId(userId);
  const payload = `${userIdEncoded}.${exp36}`;
  const sig = signTelegramPayload(payload);
  const token = `${payload}.${sig}`;
  // Ensure we never exceed Telegram's 64-character `start` limit.
  // With UUID compression, this stays well under 64 chars.
  return token.slice(0, 64);
}

export function verifyTelegramLinkToken(token: string) {
  const [userIdEncoded, exp36, sig] = token.split(".");
  if (!userIdEncoded || !exp36 || !sig) {
    return null;
  }

  const payload = `${userIdEncoded}.${exp36}`;
  const expected = signTelegramPayload(payload);
  if (expected !== sig) {
    return null;
  }

  const expiresAt = Number.parseInt(exp36, 36);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  return { userId: decodeUserId(userIdEncoded), expiresAt };
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
