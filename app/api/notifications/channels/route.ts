import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { getTelegramDeepLink, isTelegramConfigured } from "@/lib/telegram";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramChatId: true,
      devicePushTokens: {
        select: { id: true, platform: true, deviceLabel: true, lastSeenAt: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
    },
  });

  return NextResponse.json({
    pushConfigured: isFirebaseAdminConfigured() && Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY),
    telegramConfigured: isTelegramConfigured(),
    push: {
      enabled: (user?.devicePushTokens.length || 0) > 0,
      devices: (user?.devicePushTokens || []).map((token) => ({
        id: token.id,
        platform: token.platform,
        deviceLabel: token.deviceLabel,
        lastSeenAt: token.lastSeenAt,
      })),
    },
    telegram: {
      linked: Boolean(user?.telegramChatId),
      chatPreview: user?.telegramChatId ? `...${user.telegramChatId.slice(-4)}` : null,
      connectUrl: user ? getTelegramDeepLink(session.user.id) : null,
    },
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    channel?: "PUSH" | "TELEGRAM";
    tokenId?: string;
  };

  if (body.channel === "TELEGRAM") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: null,
        telegramLinkedAt: null,
      },
    });

    return NextResponse.json({ message: "Telegram disconnected" });
  }

  if (body.channel === "PUSH") {
    await prisma.devicePushToken.deleteMany({
      where: {
        userId: session.user.id,
        ...(body.tokenId ? { id: body.tokenId } : {}),
      },
    });

    return NextResponse.json({ message: "Push notifications removed for this device selection" });
  }

  return NextResponse.json({ error: "Valid channel is required" }, { status: 400 });
}
