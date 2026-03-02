import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendLowBalanceAlertEmail } from "@/lib/notifications";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.role !== "BUSINESS") {
    return NextResponse.json(
      { error: `Only BUSINESS can view tasks. Current role: ${session.user.role}` },
      { status: 403 }
    );
  }

  const tasks = await prisma.task.findMany({
    where: { businessId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `business-create-task:${ip}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.role !== "BUSINESS") {
    return NextResponse.json(
      { error: `Only BUSINESS can create tasks. Current role: ${session.user.role}` },
      { status: 403 }
    );
  }

  try {
    const { title, description, reward, totalBudget } = await req.json();
    const rewardNumber = Number(reward);
    const totalBudgetNumber = Number(totalBudget);

    if (!title || Number.isNaN(rewardNumber) || Number.isNaN(totalBudgetNumber)) {
      return NextResponse.json(
        { error: "title, reward, and totalBudget are required" },
        { status: 400 }
      );
    }

    if (rewardNumber <= 0 || totalBudgetNumber <= 0) {
      return NextResponse.json(
        { error: "Invalid reward or budget" },
        { status: 400 }
      );
    }

    const business = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!business || business.balance < totalBudgetNumber) {
      return NextResponse.json(
        { error: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.user.update({
        where: { id: session.user.id },
        data: {
          balance: {
            decrement: totalBudgetNumber,
          },
        },
        select: { balance: true },
      });

      await tx.walletTransaction.create({
        data: {
          userId: session.user.id,
          amount: totalBudgetNumber,
          type: "DEBIT",
          note: "Task budget allocated",
        },
      });

      const task = await tx.task.create({
        data: {
          title,
          description,
          reward: rewardNumber,
          totalBudget: totalBudgetNumber,
          remainingBudget: totalBudgetNumber,
          businessId: session.user.id,
        },
      });

      return { task, balance: updatedBusiness.balance };
    });

    // Low-balance alert should not block task creation.
    void sendLowBalanceAlertEmail({
      to: business.email,
      balance: result.balance,
    }).catch((error) => {
      console.error("Low balance email failed:", error);
    });

    return NextResponse.json(
      { message: "Task created", task: result.task },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
