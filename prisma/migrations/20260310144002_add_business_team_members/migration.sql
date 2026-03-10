-- CreateEnum
CREATE TYPE "BusinessAccessRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessAccessRole" "BusinessAccessRole",
ADD COLUMN     "businessOwnerId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessOwnerId_fkey" FOREIGN KEY ("businessOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
