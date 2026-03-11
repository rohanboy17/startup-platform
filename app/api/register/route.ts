import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { checkIpAccess, createSecurityEvent } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipAccess = await checkIpAccess({ ip });
    if (ipAccess.blocked) {
      await createSecurityEvent({
        kind: "REGISTER_BLOCKED_IP",
        severity: "HIGH",
        ipAddress: ip,
        message: "Registration blocked by IP access rule",
        metadata: { reason: ipAccess.reason },
      });
      return NextResponse.json({ error: "Access denied from this network" }, { status: 403 });
    }

    const rate = consumeRateLimit({
      key: `register:${ip}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429 }
      );
    }

    const { name, email, mobile, password, role } = await req.json();
    const normalizedRole =
      typeof role === "string" && ["USER", "BUSINESS"].includes(role.toUpperCase())
        ? (role.toUpperCase() as "USER" | "BUSINESS")
        : "USER";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedMobile =
      typeof mobile === "string"
        ? mobile.replace(/[\s()-]/g, "").replace(/^00/, "+")
        : "";

    if (!normalizedEmail || !normalizedMobile || !password) {
      return NextResponse.json(
        { error: "Email, mobile number, and password are required" },
        { status: 400 }
      );
    }

    if (!/^\+?[1-9]\d{7,14}$/.test(normalizedMobile)) {
      return NextResponse.json(
        { error: "Please enter a valid mobile number (example: +91987XXXX210)" },
        { status: 400 }
      );
    }

    const [existingByEmail, existingByMobile] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      prisma.user.findUnique({ where: { mobile: normalizedMobile } }),
    ]);

    if (existingByEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    if (existingByMobile) {
      return NextResponse.json({ error: "Mobile number already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        mobile: normalizedMobile,
        password: hashedPassword,
        role: normalizedRole,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register route failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
