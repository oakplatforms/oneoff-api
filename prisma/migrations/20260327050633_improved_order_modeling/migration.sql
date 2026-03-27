/*
  Warnings:

  - You are about to drop the column `createdById` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `lastModifiedById` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `inReview` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `resolution` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `refundedAmount` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `Entity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_lastModifiedById_fkey";

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "createdById",
DROP COLUMN "lastModifiedById",
ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "inReview",
DROP COLUMN "resolution";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "refundedAmount";

-- CreateIndex
CREATE INDEX "Entity_accountId_idx" ON "Entity"("accountId");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
