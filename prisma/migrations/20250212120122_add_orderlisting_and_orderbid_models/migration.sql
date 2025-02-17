/*
  Warnings:

  - You are about to drop the column `bidId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `listingId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_bidId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_listingId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "bidId",
DROP COLUMN "listingId";

-- CreateTable
CREATE TABLE "OrderListing" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "OrderListing_pkey" PRIMARY KEY ("orderId","listingId")
);

-- CreateTable
CREATE TABLE "OrderBid" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,

    CONSTRAINT "OrderBid_pkey" PRIMARY KEY ("orderId","bidId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderListing_id_key" ON "OrderListing"("id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderBid_id_key" ON "OrderBid"("id");

-- AddForeignKey
ALTER TABLE "OrderListing" ADD CONSTRAINT "OrderListing_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderListing" ADD CONSTRAINT "OrderListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBid" ADD CONSTRAINT "OrderBid_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBid" ADD CONSTRAINT "OrderBid_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
