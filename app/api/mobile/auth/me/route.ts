import { NextResponse } from "next/server";

import { verifyMobileAuthToken } from "@/lib/mobile-auth-token";
import { prisma } from "@/lib/prisma";

function readBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }
  return token.trim();
}

export async function GET(req: Request) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyMobileAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        accountStatus: true,
        sessionVersion: true,
      },
    });

    if (!user || user.accountStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.sessionVersion !== payload.sessionVersion) {
      return NextResponse.json({ error: "Session revoked. Please sign in again." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Mobile session check failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

