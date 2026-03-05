import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, description, category, taskLink, rewardPerTask, totalBudget, instructions } =
    (await req.json()) as {
      title?: string;
      description?: string;
      category?: string;
      taskLink?: string;
      rewardPerTask?: number;
      totalBudget?: number;
      instructions?: string[];
    };

  const reward = Number(rewardPerTask);
  const budget = Number(totalBudget);

  if (!title || !description || !category || Number.isNaN(reward) || Number.isNaN(budget)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (reward <= 0 || budget <= 0) {
    return NextResponse.json({ error: "Invalid reward or budget" }, { status: 400 });
  }

  const wallet = await ensureBusinessWalletSynced(session.user.id);

  if (!wallet || wallet.balance < budget) {
    return NextResponse.json({ error: "Insufficient business wallet balance" }, { status: 400 });
  }

  const campaign = await prisma.$transaction(async (tx) => {
    await tx.businessWallet.update({
      where: { businessId: session.user.id },
      data: {
        balance: { decrement: budget },
        totalSpent: { increment: budget },
      },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        balance: { decrement: budget },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: session.user.id,
        type: "DEBIT",
        amount: budget,
        note: `Campaign budget allocated: ${title}`,
      },
    });

    const created = await tx.campaign.create({
      data: {
        businessId: session.user.id,
        title,
        description,
        category,
        taskLink,
        rewardPerTask: reward,
        totalBudget: budget,
        remainingBudget: budget,
        status: "PENDING",
      },
    });

    if (instructions?.length) {
      await tx.campaignInstruction.createMany({
        data: instructions
          .filter((item) => item && item.trim())
          .map((instructionText, index) => ({
            campaignId: created.id,
            instructionText: instructionText.trim(),
            sequence: index + 1,
          })),
      });
    }

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CAMPAIGN_CREATED",
        entity: "Campaign",
        details: `campaignId=${created.id}, budget=${budget}`,
      },
    });

    return created;
  });

  return NextResponse.json({ message: "Campaign created", campaign }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: session.user.id },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}
