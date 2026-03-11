import bcrypt from "bcryptjs";
import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { checkIpAccess, createSecurityEvent } from "@/lib/security";
import { verifyAdminOtp, verifyAdminRecoveryCode } from "@/lib/admin-2fa";

function pickHeader(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") return null;
  if (headers instanceof Headers) {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  const lowered = name.toLowerCase();
  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[lowered] ?? record[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getAuthRequestIp(req: unknown) {
  const headers = (req as { headers?: unknown })?.headers;
  const xff = pickHeader(headers, "x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const realIp = pickHeader(headers, "x-real-ip");
  return realIp?.trim() || "unknown";
}

function getAuthUserAgent(req: unknown) {
  const headers = (req as { headers?: unknown })?.headers;
  return pickHeader(headers, "user-agent") || "unknown";
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Mobile", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        challengeId: { label: "Challenge ID", type: "text" },
        recoveryCode: { label: "Recovery Code", type: "text" },
      },
      async authorize(credentials, req) {
        const rawIdentifier =
          credentials?.identifier ??
          // Backward compatibility if old client still sends `email`.
          (credentials as { email?: string } | undefined)?.email;
        if (!rawIdentifier || !credentials?.password) {
          return null;
        }

        const identifier = rawIdentifier.trim();
        const normalizedEmail = identifier.toLowerCase();
        const normalizedMobile = identifier.replace(/[\s()-]/g, "").replace(/^00/, "+");
        const isEmailIdentifier = normalizedEmail.includes("@");
        const inputPassword = credentials.password;
        const ip = getAuthRequestIp(req);
        const userAgent = getAuthUserAgent(req);

        const ipAccess = await checkIpAccess({ ip });
        if (ipAccess.blocked) {
          await createSecurityEvent({
            kind: "LOGIN_BLOCKED_IP",
            severity: "HIGH",
            ipAddress: ip,
            message: `Blocked login attempt for ${identifier}`,
            metadata: { identifier, reason: ipAccess.reason },
          });
          return null;
        }

        const user = await prisma.user.findFirst({
          where: isEmailIdentifier
            ? { email: normalizedEmail }
            : { mobile: normalizedMobile },
        });

        if (!user) {
          await createSecurityEvent({
            kind: "LOGIN_FAILURE",
            severity: "LOW",
            ipAddress: ip,
            message: `Failed login for unknown account ${identifier}`,
            metadata: { identifier, userAgent },
          });
          return null;
        }

        let isValidPassword = false;

        if (user.password.startsWith("$2")) {
          isValidPassword = await bcrypt.compare(inputPassword, user.password);
        } else {
          // Backward compatibility for legacy plain-text passwords; rehash on successful login.
          isValidPassword = inputPassword === user.password;
          if (isValidPassword) {
            const hashed = await bcrypt.hash(inputPassword, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { password: hashed },
            });
          }
        }

        if (!isValidPassword) {
          await createSecurityEvent({
            kind: "LOGIN_FAILURE",
            severity: "LOW",
            userId: user.id,
            ipAddress: ip,
            message: `Invalid password for ${identifier}`,
            metadata: { identifier, userAgent },
          });

          const recentFailures = await prisma.securityEvent.count({
            where: {
              kind: "LOGIN_FAILURE",
              ipAddress: ip,
              createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
            },
          });

          if (recentFailures >= 5) {
            await createSecurityEvent({
              kind: "LOGIN_ANOMALY_SPIKE",
              severity: "HIGH",
              ipAddress: ip,
              userId: user.id,
              message: `High failed login volume from ${ip}`,
              metadata: { recentFailures, identifier },
            });
          }
          return null;
        }

        if (user.accountStatus !== "ACTIVE") {
          await createSecurityEvent({
            kind: "LOGIN_BLOCKED_STATUS",
            severity: "MEDIUM",
            userId: user.id,
            ipAddress: ip,
            message: `Blocked login for inactive user ${identifier}`,
            metadata: { accountStatus: user.accountStatus },
          });
          return null;
        }

        if (user.role === "ADMIN") {
          const adminAccess = await checkIpAccess({ ip, adminOnly: true });
          if (adminAccess.blocked) {
            await createSecurityEvent({
              kind: "ADMIN_LOGIN_RESTRICTED",
              severity: "CRITICAL",
              userId: user.id,
              ipAddress: ip,
              message: `Admin login blocked by allowlist restriction (${identifier})`,
              metadata: { reason: adminAccess.reason },
            });
            return null;
          }

          if (user.twoFactorEnabled) {
            const otp = credentials.otp?.trim() || "";
            const challengeId = credentials.challengeId?.trim() || "";
            const recoveryCode = credentials.recoveryCode?.trim() || "";

            const hasOtp = Boolean(otp && challengeId);
            const hasRecovery = Boolean(recoveryCode);

            if (!hasOtp && !hasRecovery) {
              await createSecurityEvent({
                kind: "ADMIN_2FA_MISSING_OTP",
                severity: "MEDIUM",
                userId: user.id,
                ipAddress: ip,
                message: `Admin login missing OTP for ${identifier}`,
              });
              throw new Error("OTP_REQUIRED");
            }

            let verification: { ok: true } | { ok: false; reason: string };

            if (hasRecovery) {
              verification = await verifyAdminRecoveryCode({
                userId: user.id,
                recoveryCode,
              });
            } else {
              verification = await verifyAdminOtp({
                userId: user.id,
                otp,
                challengeId,
                ipAddress: ip,
              });
            }

            if (!verification.ok) {
              await createSecurityEvent({
                kind: hasRecovery ? "ADMIN_2FA_INVALID_RECOVERY_CODE" : "ADMIN_2FA_INVALID_OTP",
                severity: "HIGH",
                userId: user.id,
                ipAddress: ip,
                message: hasRecovery
                  ? `Admin login failed recovery code validation for ${identifier}`
                  : `Admin login failed OTP validation for ${identifier}`,
                metadata: { reason: verification.reason },
              });
              throw new Error(hasRecovery ? "RECOVERY_CODE_INVALID" : "OTP_INVALID");
            }
          }
        }

        if (user.ipAddress && user.ipAddress !== ip && ip !== "unknown") {
          await createSecurityEvent({
            kind: "LOGIN_NEW_IP",
            severity: "MEDIUM",
            userId: user.id,
            ipAddress: ip,
            message: `User ${identifier} logged in from a new IP`,
            metadata: { previousIp: user.ipAddress, userAgent },
          });
        }

        if (ip !== "unknown" && user.ipAddress !== ip) {
          await prisma.user.update({
            where: { id: user.id },
            data: { ipAddress: ip },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountStatus: user.accountStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountStatus = user.accountStatus;
      }

      // Keep role/id in sync with DB so role changes apply without stale JWT behavior.
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, accountStatus: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.accountStatus = dbUser.accountStatus;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        session.user.role = (token.role as string) || "";
        session.user.accountStatus = (token.accountStatus as string) || "ACTIVE";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const handlers = NextAuth(authOptions);
export const auth = () => getServerSession(authOptions);
