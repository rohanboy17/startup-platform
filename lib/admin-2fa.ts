import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendAdminOtpEmail } from "@/lib/notifications";

const OTP_TTL_MINUTES = Number(process.env.ADMIN_2FA_OTP_TTL_MINUTES ?? 10);
const RECOVERY_CODE_COUNT = 8;

function hashOtp(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeOtp() {
  return (Math.floor(Math.random() * 900000) + 100000).toString();
}

function makeRecoveryCode() {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export async function issueAdminOtp(params: {
  userId: string;
  email: string;
  ipAddress?: string | null;
}) {
  const otp = makeOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.adminTwoFactorChallenge.create({
    data: {
      userId: params.userId,
      ipAddress: params.ipAddress ?? null,
      codeHash: hashOtp(otp),
      expiresAt,
    },
  });

  const delivery = await sendAdminOtpEmail({
    to: params.email,
    otp,
    expiresInMinutes: OTP_TTL_MINUTES,
  });

  return { expiresAt, otp, delivery };
}

export async function verifyAdminOtp(params: {
  userId: string;
  otp: string;
  challengeId?: string;
  ipAddress?: string | null;
}) {
  const now = new Date();
  const normalized = params.otp.trim();
  if (!/^\d{6}$/.test(normalized)) {
    return { ok: false as const, reason: "invalid-format" };
  }

  const challenge = await prisma.adminTwoFactorChallenge.findFirst({
    where: {
      id: params.challengeId || undefined,
      userId: params.userId,
      consumedAt: null,
      expiresAt: { gt: now },
      ...(params.ipAddress && params.ipAddress !== "unknown"
        ? { OR: [{ ipAddress: params.ipAddress }, { ipAddress: null }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false as const, reason: "challenge-missing" };
  }

  const otpHash = hashOtp(normalized);
  const valid =
    challenge.codeHash.length === otpHash.length &&
    crypto.timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(otpHash));

  if (!valid) {
    await prisma.adminTwoFactorChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, reason: "otp-invalid" };
  }

  await prisma.adminTwoFactorChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true as const };
}

export async function generateAdminRecoveryCodes(params: { userId: string }) {
  const plainCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => makeRecoveryCode());
  const codeRows = plainCodes.map((code) => ({ userId: params.userId, codeHash: hashOtp(code) }));

  await prisma.$transaction([
    prisma.adminTwoFactorRecoveryCode.deleteMany({
      where: { userId: params.userId, usedAt: null },
    }),
    prisma.adminTwoFactorRecoveryCode.createMany({
      data: codeRows,
    }),
  ]);

  return plainCodes;
}

export async function verifyAdminRecoveryCode(params: {
  userId: string;
  recoveryCode: string;
}) {
  const normalized = params.recoveryCode.trim().toUpperCase();
  if (!normalized) return { ok: false as const, reason: "missing" };

  const codeHash = hashOtp(normalized);
  const row = await prisma.adminTwoFactorRecoveryCode.findFirst({
    where: {
      userId: params.userId,
      codeHash,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return { ok: false as const, reason: "invalid" };

  await prisma.adminTwoFactorRecoveryCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return { ok: true as const };
}
