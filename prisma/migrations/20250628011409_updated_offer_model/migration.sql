/*
  Warnings:

  - You are about to drop the column `listingId` on the `Offer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[offerId]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_listingId_fkey";

-- DropIndex
DROP INDEX "Offer_listingId_key";

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "offerId" TEXT;

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "listingId";

-- CreateIndex
CREATE UNIQUE INDEX "Listing_offerId_key" ON "Listing"("offerId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
