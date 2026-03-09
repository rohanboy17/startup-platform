import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rules = await prisma.ipAccessRule.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    ip?: string;
    type?: "BLOCK" | "ALLOW";
    note?: string;
    expiresAt?: string;
  };

  const ip = body.ip?.trim();
  const type = body.type;

  if (!ip || !type || !["BLOCK", "ALLOW"].includes(type)) {
    return NextResponse.json({ error: "ip and valid type are required" }, { status: 400 });
  }

  const rule = await prisma.ipAccessRule.upsert({
    where: { ip },
    update: {
      type,
      note: body.note?.trim() || null,
      isActive: true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    create: {
      ip,
      type,
      note: body.note?.trim() || null,
      isActive: true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_IP_RULE_UPSERT",
      details: `ip=${rule.ip}, type=${rule.type}, active=${rule.isActive}`,
    },
  });

  return NextResponse.json({ message: "IP rule saved", rule });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    isActive?: boolean;
    type?: "BLOCK" | "ALLOW";
    note?: string;
    expiresAt?: string | null;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await prisma.ipAccessRule.update({
    where: { id: body.id },
    data: {
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      type: body.type,
      note: body.note === undefined ? undefined : body.note.trim() || null,
      expiresAt:
        body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_IP_RULE_UPDATE",
      details: `id=${updated.id}, ip=${updated.ip}, type=${updated.type}, active=${updated.isActive}`,
    },
  });

  return NextResponse.json({ message: "IP rule updated", rule: updated });
}
