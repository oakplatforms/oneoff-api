/*
  Warnings:

  - You are about to drop the column `profileId` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `Review` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_profileId_fkey";

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_profileId_fkey";

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "profileId",
ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "List" DROP COLUMN "profileId",
ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "profileId",
ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Marketplace" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "profileId",
ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "ShippingCategory" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "ShippingOption" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "SupportedTagValues" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Theme" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Marketplace" ADD CONSTRAINT "Marketplace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marketplace" ADD CONSTRAINT "Marketplace_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCategory" ADD CONSTRAINT "ShippingCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCategory" ADD CONSTRAINT "ShippingCategory_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValues" ADD CONSTRAINT "SupportedTagValues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValues" ADD CONSTRAINT "SupportedTagValues_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
