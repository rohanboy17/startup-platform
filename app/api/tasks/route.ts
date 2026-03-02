import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      status: "ACTIVE",
      remainingBudget: {
        gt: 0,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      reward: true,
      remainingBudget: true,
    },
  });

  return NextResponse.json({ tasks });
}
