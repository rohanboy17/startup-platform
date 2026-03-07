import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { writeAuditLog } from "@/lib/audit";

type WalletAction = "CREDIT" | "DEBIT";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-user-wallet:${ip}`,
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const { action, amount, note } = (await req.json()) as {
    action?: WalletAction;
    amount?: number;
    note?: string;
  };

  const amountNumber = Number(amount);
  if (!action || !["CREDIT", "DEBIT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, balance: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "DEBIT" && user.balance < amountNumber) {
    return NextResponse.json({ error: "Insufficient user balance" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        balance:
          action === "CREDIT"
            ? { increment: amountNumber }
            : { decrement: amountNumber },
      },
      select: { id: true, email: true, balance: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        amount: amountNumber,
        type: action,
        note: note?.trim() || `Admin ${action.toLowerCase()} adjustment`,
      },
    });

    return updatedUser;
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    targetUserId: userId,
    action: "USER_WALLET_ADJUSTED",
    details: `email=${user.email}, action=${action}, amount=${amountNumber}, note=${note?.trim() || "-"}`,
  });

  return NextResponse.json({
    message: "Wallet updated",
    user: updated,
  });
}

