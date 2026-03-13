ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

ALTER TYPE "DeliveryChannel" ADD VALUE IF NOT EXISTS 'PUSH';
ALTER TYPE "DeliveryChannel" ADD VALUE IF NOT EXISTS 'TELEGRAM';

CREATE TABLE "DevicePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DevicePushToken_token_key" ON "DevicePushToken"("token");

ALTER TABLE "DevicePushToken"
ADD CONSTRAINT "DevicePushToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
