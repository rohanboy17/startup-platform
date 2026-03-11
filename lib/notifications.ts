import nodemailer from "nodemailer";

const LOW_BALANCE_ALERT_THRESHOLD = Number(
  process.env.LOW_BALANCE_ALERT_THRESHOLD ?? 1000
);

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendLowBalanceAlertEmail(params: {
  to: string;
  balance: number;
}) {
  if (params.balance >= LOW_BALANCE_ALERT_THRESHOLD) {
    return;
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "no-reply@earnhub.local";

  if (!transporter) {
    console.info(
      `[LowBalanceAlert] SMTP not configured. Intended recipient=${params.to}, balance=${params.balance}`
    );
    return;
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject: "EarnHub: Low Wallet Balance Alert",
    text: `Your business wallet balance is low (INR ${params.balance}). Please top up to keep campaigns running without interruption.`,
  });
}

export function getMinFundingThreshold() {
  return Number(process.env.MIN_FUNDING_THRESHOLD ?? 500);
}

export async function sendAdminOtpEmail(params: {
  to: string;
  otp: string;
  expiresInMinutes: number;
}) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "no-reply@earnhub.local";

  if (!transporter) {
    console.info(
      `[Admin2FA] SMTP not configured. Intended recipient=${params.to}, otp=${params.otp}`
    );
    return { delivered: false as const, channel: "log" as const };
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject: "EarnHub Admin Login Verification Code",
    text: `Your one-time admin login code is ${params.otp}. It expires in ${params.expiresInMinutes} minutes.`,
  });
  return { delivered: true as const, channel: "smtp" as const };
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "no-reply@earnhub.local";

  if (!transporter) {
    console.info(
      `[PasswordReset] SMTP not configured. Intended recipient=${params.to}, resetUrl=${params.resetUrl}`
    );
    return { delivered: false as const, channel: "log" as const };
  }

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: "EarnHub Password Reset",
      text: `Reset your password using this link: ${params.resetUrl}\n\nThis link expires in ${params.expiresInMinutes} minutes.`,
    });
  } catch (error) {
    console.error("[PasswordReset] SMTP send failed:", error);
    return { delivered: false as const, channel: "smtp_error" as const };
  }

  return { delivered: true as const, channel: "smtp" as const };
}
