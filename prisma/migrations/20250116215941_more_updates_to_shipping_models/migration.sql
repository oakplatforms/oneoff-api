/*
  Warnings:

  - You are about to drop the column `isRequired` on the `ShippingCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BidShippingCategory" ADD COLUMN     "nonRequiredShippingOptionIds" TEXT[],
ADD COLUMN     "shippingTotal" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ListingShippingCategory" ADD COLUMN     "nonRequiredShippingOptionIds" TEXT[],
ADD COLUMN     "shippingTotal" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ShippingCategory" DROP COLUMN "isRequired";

-- AlterTable
ALTER TABLE "ShippingOption" ADD COLUMN     "isRequired" BOOLEAN;
