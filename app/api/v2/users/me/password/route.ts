import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizePassword(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const currentPassword = normalizePassword(body.currentPassword);
  const newPassword = normalizePassword(body.newPassword);
  const confirmPassword = normalizePassword(body.confirmPassword);

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing password fields" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "New password must be different" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, accountStatus: true },
  });

  if (!user || user.accountStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let ok = false;
  if (user.password.startsWith("$2")) {
    ok = await bcrypt.compare(currentPassword, user.password);
  } else {
    ok = currentPassword === user.password;
  }

  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, sessionVersion: { increment: 1 } },
  });

  return NextResponse.json({ message: "Password updated. Please sign in again." });
}

