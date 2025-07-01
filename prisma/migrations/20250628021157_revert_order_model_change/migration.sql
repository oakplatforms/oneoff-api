/*
  Warnings:

  - You are about to drop the column `offerId` on the `Listing` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[listingId]` on the table `Offer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_offerId_fkey";

-- DropIndex
DROP INDEX "Listing_offerId_key";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "offerId";

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "listingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Offer_listingId_key" ON "Offer"("listingId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
