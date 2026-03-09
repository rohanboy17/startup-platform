import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "ALL") as StatusFilter;
  const targetUserId = searchParams.get("targetUserId")?.trim() || "";

  const items = await prisma.walletAdjustmentRequest.findMany({
    where: {
      ...(status !== "ALL" ? { status } : {}),
      ...(targetUserId ? { targetUserId } : {}),
    },
    include: {
      targetUser: { select: { id: true, name: true, email: true, balance: true } },
      requestedByUser: { select: { id: true, name: true, email: true } },
      reviewedByUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ items });
}

