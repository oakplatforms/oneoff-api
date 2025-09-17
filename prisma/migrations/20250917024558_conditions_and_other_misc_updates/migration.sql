/*
  Warnings:

  - You are about to drop the column `condition` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `condition` on the `Listing` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderListing" DROP CONSTRAINT "OrderListing_listingId_fkey";

-- DropForeignKey
ALTER TABLE "OrderListing" DROP CONSTRAINT "OrderListing_orderId_fkey";

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "condition";

-- AlterTable
ALTER TABLE "EntityList" ADD COLUMN     "quantity" INTEGER,
ADD CONSTRAINT "EntityList_pkey" PRIMARY KEY ("listId", "entityId");

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "banner" TEXT,
ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "condition",
ADD COLUMN     "conditionId" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "banner" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo" TEXT;

-- DropEnum
DROP TYPE "Condition";

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BidToCondition" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Condition_name_key" ON "Condition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_BidToCondition_AB_unique" ON "_BidToCondition"("A", "B");

-- CreateIndex
CREATE INDEX "_BidToCondition_B_index" ON "_BidToCondition"("B");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderListing" ADD CONSTRAINT "OrderListing_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderListing" ADD CONSTRAINT "OrderListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BidToCondition" ADD CONSTRAINT "_BidToCondition_A_fkey" FOREIGN KEY ("A") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BidToCondition" ADD CONSTRAINT "_BidToCondition_B_fkey" FOREIGN KEY ("B") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
