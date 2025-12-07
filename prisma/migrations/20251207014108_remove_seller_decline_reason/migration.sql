/*
  Warnings:

  - You are about to drop the column `description` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `sellerDeclineReason` on the `Refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "description",
DROP COLUMN "sellerDeclineReason",
ADD COLUMN     "refundedAt" TIMESTAMP(3);
