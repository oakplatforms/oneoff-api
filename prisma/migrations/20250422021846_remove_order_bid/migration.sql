/*
  Warnings:

  - You are about to drop the `OrderBid` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderBid" DROP CONSTRAINT "OrderBid_bidId_fkey";

-- DropForeignKey
ALTER TABLE "OrderBid" DROP CONSTRAINT "OrderBid_orderId_fkey";

-- AlterTable
ALTER TABLE "OrderListing" ADD COLUMN     "quantity" INTEGER;

-- DropTable
DROP TABLE "OrderBid";
