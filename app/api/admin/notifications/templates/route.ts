import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const templates = await prisma.notificationTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    key?: string;
    name?: string;
    channel?: "IN_APP" | "EMAIL" | "SMS" | "PUSH" | "TELEGRAM";
    subject?: string;
    body?: string;
    enabled?: boolean;
  };

  const key = body.key?.trim();
  const name = body.name?.trim();
  const messageBody = body.body?.trim();

  if (!key || !name || !messageBody) {
    return NextResponse.json({ error: "key, name and body are required" }, { status: 400 });
  }

  const template = await prisma.notificationTemplate.upsert({
    where: { key },
    update: {
      name,
      channel: body.channel || "IN_APP",
      subject: body.subject?.trim() || null,
      body: messageBody,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
    },
    create: {
      key,
      name,
      channel: body.channel || "IN_APP",
      subject: body.subject?.trim() || null,
      body: messageBody,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_NOTIFICATION_TEMPLATE_UPSERT",
      details: `key=${template.key}`,
      afterState: template,
    },
  });

  return NextResponse.json({ message: "Template saved", template });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    enabled?: boolean;
  };

  if (!body.id || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "id and enabled are required" }, { status: 400 });
  }

  const before = await prisma.notificationTemplate.findUnique({ where: { id: body.id } });
  if (!before) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const template = await prisma.notificationTemplate.update({
    where: { id: body.id },
    data: { enabled: body.enabled },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_NOTIFICATION_TEMPLATE_TOGGLE",
      details: `key=${template.key}, enabled=${template.enabled}`,
      beforeState: before,
      afterState: template,
    },
  });

  return NextResponse.json({ message: "Template updated", template });
}
