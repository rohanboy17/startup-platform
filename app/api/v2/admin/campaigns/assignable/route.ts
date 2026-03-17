import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "work").trim().toLowerCase();

  const campaigns = await prisma.campaign.findMany({
    where: {
      category,
      status: { in: ["PENDING", "APPROVED", "LIVE"] },
    },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      rewardPerTask: true,
      remainingBudget: true,
      totalBudget: true,
      submissionMode: true,
      createdAt: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      status: c.status,
      rewardPerTask: c.rewardPerTask,
      remainingBudget: c.remainingBudget,
      totalBudget: c.totalBudget,
      submissionMode: c.submissionMode,
      createdAt: c.createdAt.toISOString(),
      assignedUsers: c._count.assignments,
    })),
  });
}

