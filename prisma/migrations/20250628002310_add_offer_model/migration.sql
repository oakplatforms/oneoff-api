/*
  Warnings:

  - A unique constraint covering the columns `[offerId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "offerId" TEXT;

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "bidId" TEXT,
    "listingId" TEXT,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_listingId_key" ON "Offer"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_offerId_key" ON "Order"("offerId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
