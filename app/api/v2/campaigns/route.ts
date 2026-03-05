import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "LIVE",
      remainingBudget: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      taskLink: true,
      rewardPerTask: true,
      remainingBudget: true,
      totalBudget: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}
