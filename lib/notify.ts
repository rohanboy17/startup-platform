import { prisma } from "@/lib/prisma";
import type { DeliveryChannel, DeliveryStatus, NotificationType, Prisma } from "@prisma/client";

export async function sendInAppNotification(input: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  templateKey?: string;
  payload?: Prisma.InputJsonValue;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? "INFO",
      },
    });

    await prisma.notificationDeliveryLog.create({
      data: {
        userId: input.userId,
        notificationId: notification.id,
        templateKey: input.templateKey ?? null,
        channel: "IN_APP",
        status: "SENT",
        payload: input.payload,
      },
    });

    return { ok: true as const, notificationId: notification.id };
  } catch (error) {
    await prisma.notificationDeliveryLog.create({
      data: {
        userId: input.userId,
        templateKey: input.templateKey ?? null,
        channel: "IN_APP",
        status: "FAILED",
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        payload: input.payload,
      },
    });

    return { ok: false as const };
  }
}

export async function renderTemplateMessage(params: {
  key: string;
  fallbackTitle: string;
  fallbackBody: string;
  vars?: Record<string, string | number>;
}) {
  const template = await prisma.notificationTemplate.findUnique({ where: { key: params.key } });
  const vars = params.vars || {};

  const applyVars = (text: string) =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), text);

  if (!template || !template.enabled) {
    return {
      title: params.fallbackTitle,
      message: applyVars(params.fallbackBody),
      templateKey: params.key,
      channel: "IN_APP" as DeliveryChannel,
      usedTemplate: false,
    };
  }

  return {
    title: applyVars(template.subject || params.fallbackTitle),
    message: applyVars(template.body),
    templateKey: params.key,
    channel: template.channel,
    usedTemplate: true,
  };
}

export async function logNotificationDelivery(input: {
  userId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  templateKey?: string | null;
  error?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.notificationDeliveryLog.create({
    data: {
      userId: input.userId,
      channel: input.channel,
      status: input.status,
      templateKey: input.templateKey ?? null,
      error: input.error ?? null,
      payload: input.payload,
    },
  });
}
