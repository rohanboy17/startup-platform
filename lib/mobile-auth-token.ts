import crypto from "crypto";

export type MobileAuthTokenPayload = {
  sub: string;
  role: string;
  name?: string | null;
  email?: string | null;
  sessionVersion: number;
  iat: number;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSecret() {
  const fromEnv = process.env.MOBILE_AUTH_SECRET?.trim();
  const fallback = process.env.NEXTAUTH_SECRET?.trim();
  const secret = fromEnv || fallback;
  if (!secret) {
    throw new Error("MOBILE_AUTH_SECRET or NEXTAUTH_SECRET must be configured");
  }
  return secret;
}

function sign(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

export function createMobileAuthToken(input: {
  sub: string;
  role: string;
  name?: string | null;
  email?: string | null;
  sessionVersion: number;
  ttlSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: MobileAuthTokenPayload = {
    sub: input.sub,
    role: input.role,
    name: input.name ?? null,
    email: input.email ?? null,
    sessionVersion: input.sessionVersion,
    iat: now,
    exp: now + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(unsigned, getSecret());
  return `${unsigned}.${signature}`;
}

export function verifyMobileAuthToken(token: string): MobileAuthTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, incomingSig] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = sign(unsigned, getSecret());
  const incoming = Buffer.from(incomingSig);
  const expected = Buffer.from(expectedSig);
  if (incoming.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(incoming, expected)) return null;

  try {
    const headerRaw = decodeBase64Url(encodedHeader);
    const payloadRaw = decodeBase64Url(encodedPayload);
    const header = JSON.parse(headerRaw) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const payload = JSON.parse(payloadRaw) as MobileAuthTokenPayload;
    if (!payload?.sub || !payload?.role || !payload?.exp) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

