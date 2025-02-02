/*
  Warnings:

  - You are about to drop the column `nonRequiredShippingOptionIds` on the `BidShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shippingTotal` on the `BidShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `nonRequiredShippingOptionIds` on the `ListingShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shippingTotal` on the `ListingShippingCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BidShippingCategory" DROP COLUMN "nonRequiredShippingOptionIds",
DROP COLUMN "shippingTotal";

-- AlterTable
ALTER TABLE "ListingShippingCategory" DROP COLUMN "nonRequiredShippingOptionIds",
DROP COLUMN "shippingTotal";

-- CreateTable
CREATE TABLE "ListingCustomShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "ListingCustomShippingOption_pkey" PRIMARY KEY ("listingId","shippingOptionId")
);

-- CreateTable
CREATE TABLE "BidCustomShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bidId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "BidCustomShippingOption_pkey" PRIMARY KEY ("bidId","shippingOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingCustomShippingOption_id_key" ON "ListingCustomShippingOption"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BidCustomShippingOption_id_key" ON "BidCustomShippingOption"("id");

-- AddForeignKey
ALTER TABLE "ListingCustomShippingOption" ADD CONSTRAINT "ListingCustomShippingOption_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCustomShippingOption" ADD CONSTRAINT "ListingCustomShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidCustomShippingOption" ADD CONSTRAINT "BidCustomShippingOption_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidCustomShippingOption" ADD CONSTRAINT "BidCustomShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
