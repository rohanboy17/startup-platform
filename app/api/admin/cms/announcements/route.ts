import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    message?: string;
    link?: string;
    isActive?: boolean;
  };
  const title = body.title?.trim() || "";
  const message = body.message?.trim() || "";
  if (!title || !message) {
    return NextResponse.json({ error: "title and message are required" }, { status: 400 });
  }

  const item = await prisma.announcement.create({
    data: {
      title,
      message,
      link: body.link?.trim() || null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    },
  });
  return NextResponse.json({ message: "Announcement created", item });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    title?: string;
    message?: string;
    link?: string;
    isActive?: boolean;
  };
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const item = await prisma.announcement.update({
    where: { id },
    data: {
      title: body.title?.trim(),
      message: body.message?.trim(),
      link: body.link === undefined ? undefined : body.link.trim() || null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });
  return NextResponse.json({ message: "Announcement updated", item });
}

