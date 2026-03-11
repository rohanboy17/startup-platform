import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string; password?: string };
    const rawToken = (body.token || "").trim();
    const password = body.password || "";

    if (!rawToken || !password) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Password reset is not available yet. Run latest database migrations." },
        { status: 503 }
      );
    }
    console.error("[ResetPassword] failed:", error);
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 });
  }
}
