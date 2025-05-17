/*
  Warnings:

  - You are about to drop the column `shippingPackageType` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `shippingServiceType` on the `ShippingMethod` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShippingMethod" DROP COLUMN "shippingPackageType",
DROP COLUMN "shippingServiceType";

-- DropEnum
DROP TYPE "ShippingPackageType";

-- DropEnum
DROP TYPE "ShippingServiceType";
