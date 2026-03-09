import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { consumeRateLimit } from "@/lib/rate-limit";
import { checkIpAccess, createSecurityEvent } from "@/lib/security";
import { issueAdminOtp } from "@/lib/admin-2fa";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipAccess = await checkIpAccess({ ip, adminOnly: true });
    if (ipAccess.blocked) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const rate = consumeRateLimit({
      key: `admin-2fa-request:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many OTP requests" }, { status: 429 });
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "ADMIN" || !user.twoFactorEnabled || user.accountStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Admin 2FA is not available for this account" }, { status: 400 });
    }

    const valid = user.password.startsWith("$2")
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!valid) {
      await createSecurityEvent({
        kind: "ADMIN_2FA_REQUEST_INVALID_PASSWORD",
        severity: "MEDIUM",
        userId: user.id,
        ipAddress: ip,
        message: `Admin 2FA OTP request denied for ${email}`,
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { expiresAt, otp, delivery } = await issueAdminOtp({
      userId: user.id,
      email: user.email,
      ipAddress: ip,
    });

    await createSecurityEvent({
      kind: "ADMIN_2FA_OTP_ISSUED",
      severity: "LOW",
      userId: user.id,
      ipAddress: ip,
      message: `Admin OTP issued for ${email}`,
      metadata: { expiresAt: expiresAt.toISOString() },
    });

    const latestChallenge = await prisma.adminTwoFactorChallenge.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, expiresAt: true },
    });

    return NextResponse.json({
      message:
        delivery.delivered
          ? "OTP sent to admin email"
          : "SMTP not configured. OTP available in local server logs.",
      challengeId: latestChallenge?.id,
      expiresAt: latestChallenge?.expiresAt,
      devOtp: delivery.delivered || process.env.NODE_ENV === "production" ? undefined : otp,
      deliveryChannel: delivery.channel,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 });
  }
}
