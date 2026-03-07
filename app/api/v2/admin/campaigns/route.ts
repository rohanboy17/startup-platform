import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    include: {
      business: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}
