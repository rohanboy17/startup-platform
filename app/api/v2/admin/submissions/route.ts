import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      campaignId: { not: null },
      managerStatus: "MANAGER_APPROVED",
      adminStatus: "PENDING",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, level: true },
      },
      campaign: {
        select: { id: true, title: true, category: true, rewardPerTask: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}
