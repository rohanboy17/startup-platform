import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ flags });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as { key?: string; enabled?: boolean; description?: string };
  const key = body.key?.trim();
  if (!key || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "key and enabled are required" }, { status: 400 });
  }

  const flag = await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled: body.enabled, description: body.description?.trim() || null },
    create: {
      key,
      enabled: body.enabled,
      description: body.description?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "ADMIN_UPDATED_FEATURE_FLAG",
      entity: "FeatureFlag",
      details: `key=${key}, enabled=${body.enabled}`,
    },
  });

  return NextResponse.json({ message: "Feature flag updated", flag });
}

