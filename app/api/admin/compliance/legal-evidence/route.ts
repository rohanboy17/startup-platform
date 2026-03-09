import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType")?.trim();
  const entityId = searchParams.get("entityId")?.trim();

  const records = await prisma.legalEvidence.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({ records });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    entityType?: string;
    entityId?: string;
    note?: string;
    fileUrl?: string;
    metadata?: unknown;
  };

  const entityType = body.entityType?.trim();
  const entityId = body.entityId?.trim();
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const record = await prisma.legalEvidence.create({
    data: {
      entityType,
      entityId,
      note: body.note?.trim() || null,
      fileUrl: body.fileUrl?.trim() || null,
      metadata:
        body.metadata === undefined ? undefined : JSON.parse(JSON.stringify(body.metadata)) ,
      submittedByUserId: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "LEGAL_EVIDENCE_CREATED",
      details: `entityType=${entityType}, entityId=${entityId}`,
      afterState: record,
    },
  });

  return NextResponse.json({ message: "Evidence logged", record });
}
