/*
  Warnings:

  - You are about to drop the `ListingCustomShippingOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ListingShippingCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ListingCustomShippingOption" DROP CONSTRAINT "ListingCustomShippingOption_listingId_fkey";

-- DropForeignKey
ALTER TABLE "ListingCustomShippingOption" DROP CONSTRAINT "ListingCustomShippingOption_shippingOptionId_fkey";

-- DropForeignKey
ALTER TABLE "ListingShippingCategory" DROP CONSTRAINT "ListingShippingCategory_listingId_fkey";

-- DropForeignKey
ALTER TABLE "ListingShippingCategory" DROP CONSTRAINT "ListingShippingCategory_shippingCategoryId_fkey";

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "condition" "Condition" NOT NULL DEFAULT 'MINT';

-- DropTable
DROP TABLE "ListingCustomShippingOption";

-- DropTable
DROP TABLE "ListingShippingCategory";

-- CreateTable
CREATE TABLE "AccountShippingCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "shippingCategoryId" TEXT NOT NULL,

    CONSTRAINT "AccountShippingCategory_pkey" PRIMARY KEY ("accountId","shippingCategoryId")
);

-- CreateTable
CREATE TABLE "AccountCustomShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "AccountCustomShippingOption_pkey" PRIMARY KEY ("accountId","shippingOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountShippingCategory_id_key" ON "AccountShippingCategory"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCustomShippingOption_id_key" ON "AccountCustomShippingOption"("id");

-- AddForeignKey
ALTER TABLE "AccountShippingCategory" ADD CONSTRAINT "AccountShippingCategory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountShippingCategory" ADD CONSTRAINT "AccountShippingCategory_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCustomShippingOption" ADD CONSTRAINT "AccountCustomShippingOption_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCustomShippingOption" ADD CONSTRAINT "AccountCustomShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
