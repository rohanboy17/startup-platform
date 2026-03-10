import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { checkIpAccess, createSecurityEvent } from "@/lib/security";
import { getAppSettings } from "@/lib/system-settings";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipAccess = await checkIpAccess({ ip });
    if (ipAccess.blocked) {
      await createSecurityEvent({
        kind: "WITHDRAW_BLOCKED_IP",
        severity: "HIGH",
        ipAddress: ip,
        message: "Withdrawal request blocked by IP access rule",
        metadata: { reason: ipAccess.reason },
      });
      return NextResponse.json({ error: "Access denied from this network" }, { status: 403 });
    }

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

    const { amount, upiId, upiName } = await req.json();
    const appSettings = await getAppSettings();
    const amountNumber = Number(amount);
    const minWithdrawal = appSettings.minWithdrawalAmount;
    const normalizedUpiId = typeof upiId === "string" ? upiId.trim() : "";
    const normalizedUpiName = typeof upiName === "string" ? upiName.trim() : "";
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: "Enter a valid withdrawal amount" },
        { status: 400 }
      );
    }

    if (!normalizedUpiId || !normalizedUpiName) {
      return NextResponse.json(
        { error: "UPI ID/Number and UPI Name are required" },
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
      select: {
        balance: true,
        monthlyEmergencyWithdrawCount: true,
        emergencyWithdrawMonthKey: true,
      },
    });

    if (!user || user.balance < amountNumber) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const isEmergency = amountNumber < minWithdrawal;
    const monthlyEmergencyUsed =
      user.emergencyWithdrawMonthKey === currentMonthKey ? user.monthlyEmergencyWithdrawCount : 0;

    if (isEmergency && monthlyEmergencyUsed >= 2) {
      return NextResponse.json(
        { error: "Emergency withdrawal limit reached for this month" },
        { status: 400 }
      );
    }

    const withdrawal = await prisma.$transaction(async (tx) => {
      if (isEmergency) {
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            emergencyWithdrawCount: { increment: 1 },
            monthlyEmergencyWithdrawCount:
              user.emergencyWithdrawMonthKey === currentMonthKey
                ? { increment: 1 }
                : 1,
            emergencyWithdrawMonthKey: currentMonthKey,
          },
        });
      }

      return tx.withdrawal.create({
        data: {
          amount: amountNumber,
          upiId: normalizedUpiId,
          upiName: normalizedUpiName,
          isEmergency,
          userId: session.user.id,
        },
      });
    });

    return NextResponse.json({
      message: isEmergency
        ? "Emergency withdrawal request created"
        : "Withdrawal request created",
      emergency: isEmergency,
      withdrawal,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Withdrawal failed" },
      { status: 500 }
    );
  }
}
