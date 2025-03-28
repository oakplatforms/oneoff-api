/*
  Warnings:

  - You are about to drop the column `deliveryMethodType` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryType` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryMethodType` on the `ShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryType` on the `ShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `ShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the `AccountCustomShippingOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AccountShippingCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AccountCustomShippingOption" DROP CONSTRAINT "AccountCustomShippingOption_accountId_fkey";

-- DropForeignKey
ALTER TABLE "AccountCustomShippingOption" DROP CONSTRAINT "AccountCustomShippingOption_shippingOptionId_fkey";

-- DropForeignKey
ALTER TABLE "AccountShippingCategory" DROP CONSTRAINT "AccountShippingCategory_accountId_fkey";

-- DropForeignKey
ALTER TABLE "AccountShippingCategory" DROP CONSTRAINT "AccountShippingCategory_shippingCategoryId_fkey";

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "deliveryMethodType",
DROP COLUMN "deliveryType";

-- AlterTable
ALTER TABLE "ShippingCategory" DROP COLUMN "deliveryMethodType",
DROP COLUMN "deliveryType",
DROP COLUMN "level";

-- DropTable
DROP TABLE "AccountCustomShippingOption";

-- DropTable
DROP TABLE "AccountShippingCategory";

-- DropEnum
DROP TYPE "DeliveryMethodType";

-- DropEnum
DROP TYPE "DeliveryType";

-- CreateTable
CREATE TABLE "SellerShippingCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "shippingCategoryId" TEXT NOT NULL,

    CONSTRAINT "SellerShippingCategory_pkey" PRIMARY KEY ("sellerId","shippingCategoryId")
);

-- CreateTable
CREATE TABLE "SellerCustomShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "SellerCustomShippingOption_pkey" PRIMARY KEY ("sellerId","shippingOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerShippingCategory_id_key" ON "SellerShippingCategory"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SellerCustomShippingOption_id_key" ON "SellerCustomShippingOption"("id");

-- AddForeignKey
ALTER TABLE "SellerShippingCategory" ADD CONSTRAINT "SellerShippingCategory_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShippingCategory" ADD CONSTRAINT "SellerShippingCategory_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCustomShippingOption" ADD CONSTRAINT "SellerCustomShippingOption_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCustomShippingOption" ADD CONSTRAINT "SellerCustomShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
