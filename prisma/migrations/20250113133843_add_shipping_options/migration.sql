/*
  Warnings:

  - You are about to drop the column `amount` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `maxQuantity` on the `ShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `maxWeight` on the `ShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ShippingCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "amount",
ADD COLUMN     "price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ShippingCategory" DROP COLUMN "maxQuantity",
DROP COLUMN "maxWeight",
DROP COLUMN "price";

-- CreateTable
CREATE TABLE "ShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "maxQuantity" INTEGER,
    "maxWeight" DOUBLE PRECISION,
    "rate" DECIMAL(10,2),
    "shippingCategoryId" TEXT,

    CONSTRAINT "ShippingOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
