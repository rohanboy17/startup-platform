import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createMobileAuthToken } from "@/lib/mobile-auth-token";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { checkIpAccess, createSecurityEvent } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipAccess = await checkIpAccess({ ip });
    if (ipAccess.blocked) {
      await createSecurityEvent({
        kind: "MOBILE_LOGIN_BLOCKED_IP",
        severity: "HIGH",
        ipAddress: ip,
        message: "Mobile login blocked by IP access rule",
        metadata: { reason: ipAccess.reason },
      });
      return NextResponse.json({ error: "Access denied from this network" }, { status: 403 });
    }

    const rate = consumeRateLimit({
      key: `mobile-login:${ip}`,
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }

    const body = (await req.json()) as { identifier?: string; password?: string };
    const identifier = (body.identifier || "").trim();
    const password = body.password || "";
    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });
    }

    const normalizedEmail = identifier.toLowerCase();
    const normalizedMobile = identifier.replace(/[\s()-]/g, "").replace(/^00/, "+");
    const isEmailIdentifier = normalizedEmail.includes("@");

    const user = await prisma.user.findFirst({
      where: isEmailIdentifier ? { email: normalizedEmail } : { mobile: normalizedMobile },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        password: true,
        role: true,
        accountStatus: true,
        sessionVersion: true,
        ipAddress: true,
      },
    });

    if (!user) {
      await createSecurityEvent({
        kind: "MOBILE_LOGIN_FAILURE",
        severity: "LOW",
        ipAddress: ip,
        message: `Mobile login failed for unknown account ${identifier}`,
        metadata: { identifier },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let isValidPassword = false;
    if (user.password.startsWith("$2")) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      isValidPassword = password === user.password;
      if (isValidPassword) {
        const hashed = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashed },
        });
      }
    }

    if (!isValidPassword) {
      await createSecurityEvent({
        kind: "MOBILE_LOGIN_FAILURE",
        severity: "LOW",
        userId: user.id,
        ipAddress: ip,
        message: `Mobile login invalid password for ${identifier}`,
        metadata: { identifier },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }

    // Admin access remains web-only due to required 2FA and strict IP policy.
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts must sign in via web portal" },
        { status: 403 }
      );
    }

    if (ip !== "unknown" && user.ipAddress !== ip) {
      await prisma.user.update({
        where: { id: user.id },
        data: { ipAddress: ip },
      });
    }

    const token = createMobileAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      sessionVersion: user.sessionVersion,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Mobile login failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

