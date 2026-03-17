import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInAppNotification } from "@/lib/notify";
import { sendTelegramMessage, verifyTelegramLinkToken } from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
};

async function reply(chatId: string, text: string) {
  try {
    await sendTelegramMessage(chatId, text);
  } catch {
    // keep webhook resilient even if Telegram reply fails
  }
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update = (await req.json().catch(() => ({}))) as TelegramUpdate;
  const message = update.message;
  const chatId = message?.chat?.id ? String(message.chat.id) : "";
  const text = message?.text?.trim() || "";

  if (!chatId || !text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const token = text.split(" ")[1]?.trim();
  if (!token) {
    await reply(chatId, "Open the Telegram connect link from your FreeEarnHub dashboard to link this chat.");
    return NextResponse.json({ ok: true });
  }

  const verified = verifyTelegramLinkToken(token);
  if (!verified) {
    await reply(chatId, "This Telegram link is invalid or expired. Please request a new link from your dashboard.");
    return NextResponse.json({ ok: true });
  }

  const linkedElsewhere = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
      NOT: { id: verified.userId },
    },
    select: { id: true },
  });

  if (linkedElsewhere) {
    await reply(chatId, "This Telegram chat is already linked to another FreeEarnHub account.");
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, name: true },
  });

  if (!user) {
    await reply(chatId, "We could not find that FreeEarnHub account anymore. Please try again from the dashboard.");
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: chatId,
      telegramLinkedAt: new Date(),
    },
  });

  await sendInAppNotification({
    userId: user.id,
    title: "Telegram connected",
    message: "Your Telegram alerts are now linked and ready to receive updates.",
    type: "SUCCESS",
    templateKey: "telegram.linked",
    payload: { channel: "TELEGRAM" },
  });

  await reply(chatId, `Telegram alerts are now linked to ${user.name || "your FreeEarnHub account"}.`);
  return NextResponse.json({ ok: true });
}

