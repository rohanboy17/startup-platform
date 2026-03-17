import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeSkillLabel(input: unknown) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length > 40) return trimmed.slice(0, 40);
  return trimmed;
}

function toSlug(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rows = await prisma.userSkill.findMany({
    where: { userId: session.user.id },
    include: { skill: { select: { slug: true, label: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    skills: rows.map((row) => ({
      slug: row.skill.slug,
      label: row.skill.label,
    })),
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { skills?: unknown } | null;
  if (!body || !Array.isArray(body.skills)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const labels = body.skills
    .map((item) => normalizeSkillLabel(item))
    .filter((value): value is string => Boolean(value));

  const uniqueBySlug = new Map<string, string>();
  for (const label of labels) {
    const slug = toSlug(label);
    if (!slug) continue;
    if (!uniqueBySlug.has(slug)) uniqueBySlug.set(slug, label);
  }

  if (uniqueBySlug.size > 20) {
    return NextResponse.json({ error: "You can add up to 20 skills." }, { status: 400 });
  }

  const entries = Array.from(uniqueBySlug.entries()).map(([slug, label]) => ({ slug, label }));

  await prisma.$transaction(async (tx) => {
    await tx.userSkill.deleteMany({ where: { userId: session.user.id } });

    for (const entry of entries) {
      const skill = await tx.skill.upsert({
        where: { slug: entry.slug },
        update: { label: entry.label },
        create: { slug: entry.slug, label: entry.label },
        select: { id: true },
      });

      await tx.userSkill.create({
        data: {
          userId: session.user.id,
          skillId: skill.id,
        },
      });
    }
  });

  return NextResponse.json({ message: "Skills updated" });
}

