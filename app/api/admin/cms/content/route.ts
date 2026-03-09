import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertCmsValue } from "@/lib/cms";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key")?.trim();
  if (key) {
    const item = await prisma.cmsContent.findUnique({ where: { key } });
    return NextResponse.json({ item });
  }

  const items = await prisma.cmsContent.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as { key?: string; value?: unknown };
  const key = body.key?.trim();
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const item = await upsertCmsValue(key, body.value ?? null);
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "ADMIN_UPDATED_CMS_CONTENT",
      entity: "CmsContent",
      details: `key=${key}`,
    },
  });
  return NextResponse.json({ message: "CMS content updated", item });
}

