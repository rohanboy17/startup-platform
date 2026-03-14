import { prisma } from "@/lib/prisma";
import type { DeliveryChannel, DeliveryStatus, NotificationType, Prisma } from "@prisma/client";
import nodemailer from "nodemailer";
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

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

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmailDelivery(input: {
  userId: string;
  toEmail: string | null | undefined;
  subject: string;
  message: string;
  templateKey?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  if (!input.toEmail) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "EMAIL",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "User email missing",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "EMAIL",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "SMTP not configured",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "no-reply@earnhub.local",
      to: input.toEmail,
      subject: input.subject,
      text: input.message,
    });

    await logNotificationDelivery({
      userId: input.userId,
      channel: "EMAIL",
      status: "SENT",
      templateKey: input.templateKey,
      payload: input.payload,
    });

    return { ok: true as const, status: "SENT" as const };
  } catch (error) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "EMAIL",
      status: "FAILED",
      templateKey: input.templateKey,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      payload: input.payload,
    });
    return { ok: false as const, status: "FAILED" as const };
  }
}

export async function sendSmsDelivery(input: {
  userId: string;
  toMobile: string | null | undefined;
  message: string;
  templateKey?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  if (!input.toMobile) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "SMS",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "User mobile number missing",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  if (!webhookUrl) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "SMS",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "SMS webhook not configured",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        to: input.toMobile,
        message: input.message,
        from: process.env.SMS_FROM || "EarnHub",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      await logNotificationDelivery({
        userId: input.userId,
        channel: "SMS",
        status: "FAILED",
        templateKey: input.templateKey,
        error: `SMS webhook failed: ${body.slice(0, 300)}`,
        payload: input.payload,
      });
      return { ok: false as const, status: "FAILED" as const };
    }

    await logNotificationDelivery({
      userId: input.userId,
      channel: "SMS",
      status: "SENT",
      templateKey: input.templateKey,
      payload: input.payload,
    });
    return { ok: true as const, status: "SENT" as const };
  } catch (error) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "SMS",
      status: "FAILED",
      templateKey: input.templateKey,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      payload: input.payload,
    });
    return { ok: false as const, status: "FAILED" as const };
  }
}

export async function sendPushDelivery(input: {
  userId: string;
  title: string;
  message: string;
  templateKey?: string | null;
  payload?: Prisma.InputJsonValue;
  data?: Record<string, string | number | boolean | null | undefined>;
}) {
  const tokens = await prisma.devicePushToken.findMany({
    where: { userId: input.userId },
    select: { token: true },
  });

  if (tokens.length === 0) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "PUSH",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "No registered device push token",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  if (!isFirebaseAdminConfigured()) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "PUSH",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "Firebase Admin is not configured",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "PUSH",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "Firebase messaging unavailable",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  const retryableCodes = new Set<string>([
    "messaging/internal-error",
    "messaging/server-unavailable",
    "messaging/unknown-error",
  ]);

  const normalizedData = input.data
    ? Object.fromEntries(
        Object.entries(input.data)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      )
    : undefined;

  const link = normalizedData?.link;
  const webpush =
    typeof link === "string" && link.trim().length > 0
      ? {
          fcmOptions: { link },
        }
      : undefined;

  try {
    const basePayload = {
      notification: {
        title: input.title,
        body: input.message,
      },
      data: normalizedData,
      webpush,
    } as const;

    const result = await messaging.sendEachForMulticast({
      tokens: tokens.map((item) => item.token),
      ...basePayload,
    });

    const failureDetails = result.responses
      .map((response, index) => {
        if (response.success) return null;
        return {
          code: response.error?.code || "unknown",
          message: response.error?.message || "unknown error",
          // Never log full tokens; just a short prefix for correlation.
          tokenPrefix: tokens[index]?.token?.slice(0, 16) || "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    // Retry once when FCM returns only retryable server-side errors (common with web push).
    const uniqueFailureCodes = new Set(failureDetails.map((item) => item.code));
    const shouldRetry =
      result.successCount === 0 &&
      failureDetails.length > 0 &&
      Array.from(uniqueFailureCodes).every((code) => retryableCodes.has(code));

    const retryResult = shouldRetry
      ? await (async () => {
          await new Promise((r) => setTimeout(r, 600));
          return messaging.sendEachForMulticast({
            tokens: tokens.map((item) => item.token),
            ...basePayload,
          });
        })()
      : null;

    const finalResult = retryResult ?? result;

    const finalFailureDetails = finalResult.responses
      .map((response, index) => {
        if (response.success) return null;
        return {
          code: response.error?.code || "unknown",
          message: response.error?.message || "unknown error",
          tokenPrefix: tokens[index]?.token?.slice(0, 16) || "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const invalidTokens = result.responses
      .map((response, index) => ({ response, token: tokens[index]?.token }))
      .filter(({ response }) => {
        const code = response.error?.code || "";
        return (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        );
      })
      .map(({ token }) => token)
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length > 0) {
      await prisma.devicePushToken.deleteMany({
        where: {
          token: { in: invalidTokens },
        },
      });
    }

    const failed = finalResult.failureCount;
    const success = finalResult.successCount;
    const status = success > 0 ? "SENT" : "FAILED";

    const codes = Array.from(new Set(finalFailureDetails.map((item) => item.code)));
    const errorSummary =
      failed > 0
        ? `${failed} device notification(s) failed${codes.length ? ` (${codes.join(", ")})` : ""}`
        : null;

    const deliveryPayload: Prisma.InputJsonValue = (() => {
      const base =
        input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
          ? (input.payload as Record<string, unknown>)
          : { payload: input.payload ?? null };

      return {
        ...base,
        push: {
          successCount: success,
          failureCount: failed,
          codes,
          retried: Boolean(retryResult),
          sampleErrors: finalFailureDetails.slice(0, 3),
        },
      };
    })();

    await logNotificationDelivery({
      userId: input.userId,
      channel: "PUSH",
      status,
      templateKey: input.templateKey,
      error: errorSummary,
      payload: deliveryPayload,
    });

    return { ok: success > 0 as boolean, status, details: { successCount: success, failureCount: failed, codes, retried: Boolean(retryResult) } };
  } catch (error) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "PUSH",
      status: "FAILED",
      templateKey: input.templateKey,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      payload: input.payload,
    });
    return { ok: false as const, status: "FAILED" as const };
  }
}

export async function sendTelegramDelivery(input: {
  userId: string;
  toChatId: string | null | undefined;
  message: string;
  templateKey?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  if (!input.toChatId) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "TELEGRAM",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "Telegram account not linked",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  if (!isTelegramConfigured()) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "TELEGRAM",
      status: "SKIPPED",
      templateKey: input.templateKey,
      error: "Telegram bot is not configured",
      payload: input.payload,
    });
    return { ok: false as const, status: "SKIPPED" as const };
  }

  try {
    await sendTelegramMessage(input.toChatId, input.message);
    await logNotificationDelivery({
      userId: input.userId,
      channel: "TELEGRAM",
      status: "SENT",
      templateKey: input.templateKey,
      payload: input.payload,
    });
    return { ok: true as const, status: "SENT" as const };
  } catch (error) {
    await logNotificationDelivery({
      userId: input.userId,
      channel: "TELEGRAM",
      status: "FAILED",
      templateKey: input.templateKey,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      payload: input.payload,
    });
    return { ok: false as const, status: "FAILED" as const };
  }
}

export async function sendNotificationChannels(input: {
  user: {
    id: string;
    email?: string | null;
    mobile?: string | null;
    telegramChatId?: string | null;
  };
  channels: DeliveryChannel[];
  title: string;
  message: string;
  type?: NotificationType;
  templateKey?: string | null;
  payload?: Prisma.InputJsonValue;
  pushData?: Record<string, string | number | boolean | null | undefined>;
}) {
  const results: Array<{ channel: DeliveryChannel; ok: boolean; status: DeliveryStatus }> = [];

  for (const channel of input.channels) {
    if (channel === "IN_APP") {
      const result = await sendInAppNotification({
        userId: input.user.id,
        title: input.title,
        message: input.message,
        type: input.type,
        templateKey: input.templateKey ?? undefined,
        payload: input.payload,
      });
      results.push({ channel, ok: result.ok, status: result.ok ? "SENT" : "FAILED" });
      continue;
    }

    if (channel === "EMAIL") {
      const result = await sendEmailDelivery({
        userId: input.user.id,
        toEmail: input.user.email,
        subject: input.title,
        message: input.message,
        templateKey: input.templateKey,
        payload: input.payload,
      });
      results.push({ channel, ok: result.ok, status: result.status as DeliveryStatus });
      continue;
    }

    if (channel === "SMS") {
      const result = await sendSmsDelivery({
        userId: input.user.id,
        toMobile: input.user.mobile,
        message: input.message,
        templateKey: input.templateKey,
        payload: input.payload,
      });
      results.push({ channel, ok: result.ok, status: result.status as DeliveryStatus });
      continue;
    }

    if (channel === "PUSH") {
      const result = await sendPushDelivery({
        userId: input.user.id,
        title: input.title,
        message: input.message,
        templateKey: input.templateKey,
        payload: input.payload,
        data: input.pushData,
      });
      results.push({ channel, ok: result.ok, status: result.status as DeliveryStatus });
      continue;
    }

    if (channel === "TELEGRAM") {
      const result = await sendTelegramDelivery({
        userId: input.user.id,
        toChatId: input.user.telegramChatId,
        message: `${input.title}\n\n${input.message}`,
        templateKey: input.templateKey,
        payload: input.payload,
      });
      results.push({ channel, ok: result.ok, status: result.status as DeliveryStatus });
    }
  }

  return results;
}
