-- AlterTable
ALTER TABLE "User" ADD COLUMN     "perkCreditBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recommendationBoostExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PerkTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerkTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PerkTransaction" ADD CONSTRAINT "PerkTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
