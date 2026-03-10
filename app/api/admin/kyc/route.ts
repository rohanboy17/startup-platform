import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const requests = await prisma.businessKycRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      business: {
        select: { id: true, name: true, email: true, kycStatus: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ requests });
}

