import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: `Only ADMIN can activate tasks. Current role: ${session.user.role}` },
      { status: 403 }
    );
  }

  try {
    const { action } = await req.json();

    if (!["ACTIVE", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use ACTIVE or REJECTED" },
        { status: 400 }
      );
    }

    const { taskId } = await params;
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: action },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      targetUserId: updatedTask.businessId,
      action: action === "ACTIVE" ? "TASK_APPROVED" : "TASK_REJECTED",
      details: `taskId=${updatedTask.id}, previousStatus=${existingTask.status}`,
    });

    return NextResponse.json({
      message: `Task ${action}`,
      task: updatedTask,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
