import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: { status: "PENDING" },
    include: { user: true },
  });

  return NextResponse.json({ withdrawals });
}
