import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/notifications";

const RESET_TOKEN_TTL_MINUTES = 30;

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return trimmed.replace(/[\s()-]/g, "").replace(/^00/, "+");
}

function getBaseUrl(req: Request) {
  const requestOrigin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return "";
    }
  })();
  if (requestOrigin) return requestOrigin;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) return nextAuthUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { identifier?: string };
    const normalized = normalizeIdentifier(body.identifier || "");

    if (!normalized) {
      return NextResponse.json(
        { error: "Email or mobile number is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: normalized.includes("@")
        ? { email: normalized }
        : { mobile: normalized },
      select: { id: true, email: true, accountStatus: true },
    });

    if (user?.email && user.accountStatus === "ACTIVE") {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        }),
      ]);

      const resetUrl = `${getBaseUrl(req)}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    }

    return NextResponse.json({
      message:
        "If an account exists for that email/mobile, a password reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Forgot password is not available yet. Run latest database migrations." },
        { status: 503 }
      );
    }
    console.error("[ForgotPassword] failed:", error);
    return NextResponse.json(
      { error: "Unable to process forgot password request" },
      { status: 500 }
    );
  }
}
