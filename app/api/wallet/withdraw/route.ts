import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = consumeRateLimit({
      key: `withdraw:${ip}`,
      limit: 15,
      windowMs: 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await auth();

    if (!session || session.user.role !== "USER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { amount } = await req.json();
    const amountNumber = Number(amount);
    const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 200);

    if (Number.isNaN(amountNumber) || amountNumber < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is INR ${minWithdrawal}` },
        { status: 400 }
      );
    }

    const pending = await prisma.withdrawal.findFirst({
      where: { userId: session.user.id, status: "PENDING" },
      select: { id: true },
    });

    if (pending) {
      return NextResponse.json(
        { error: "You already have a pending withdrawal request" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });

    if (!user || user.balance < amountNumber) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        amount: amountNumber,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: "Withdrawal request created",
      withdrawal,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Withdrawal failed" },
      { status: 500 }
    );
  }
}
