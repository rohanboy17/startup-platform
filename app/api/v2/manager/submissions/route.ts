import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      campaignId: { not: null },
      managerStatus: "PENDING",
      managerEscalatedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          level: true,
          totalApproved: true,
          totalRejected: true,
          isSuspicious: true,
          suspiciousReason: true,
        },
      },
      campaign: {
        select: {
          id: true,
          title: true,
          category: true,
          rewardPerTask: true,
          description: true,
          taskLink: true,
          instructions: {
            select: { sequence: true, instructionText: true },
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}
