import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    token?: string;
    deviceLabel?: string;
    platform?: string;
  };

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Push token is required" }, { status: 400 });
  }

  const record = await prisma.devicePushToken.upsert({
    where: { token },
    update: {
      userId: session.user.id,
      deviceLabel: body.deviceLabel?.trim() || null,
      platform: body.platform?.trim() || null,
      lastSeenAt: new Date(),
    },
    create: {
      userId: session.user.id,
      token,
      deviceLabel: body.deviceLabel?.trim() || null,
      platform: body.platform?.trim() || null,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ message: "Push notifications enabled for this device", record });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Push token is required" }, { status: 400 });
  }

  await prisma.devicePushToken.deleteMany({
    where: {
      userId: session.user.id,
      token,
    },
  });

  return NextResponse.json({ message: "Push notifications disabled for this device" });
}
