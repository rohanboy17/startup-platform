import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const skills = await prisma.skill.findMany({
    select: { id: true, slug: true, label: true, createdAt: true },
    orderBy: { label: "asc" },
    take: 1000,
  });

  const counts = await prisma.userSkill.groupBy({
    by: ["skillId"],
    _count: { _all: true },
    where: {
      user: {
        role: "USER",
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
    },
  });

  const countMap = new Map<string, number>();
  for (const row of counts) {
    countMap.set(row.skillId, row._count._all);
  }

  return NextResponse.json({
    skills: skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      label: s.label,
      activeUserCount: countMap.get(s.id) ?? 0,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

