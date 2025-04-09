/*
  Warnings:

  - You are about to drop the column `shippingCategoryId` on the `ShippingOption` table. All the data in the column will be lost.
  - You are about to drop the `BidShippingCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SellerShippingCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShippingCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BidShippingCategory" DROP CONSTRAINT "BidShippingCategory_bidId_fkey";

-- DropForeignKey
ALTER TABLE "BidShippingCategory" DROP CONSTRAINT "BidShippingCategory_shippingCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "SellerShippingCategory" DROP CONSTRAINT "SellerShippingCategory_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "SellerShippingCategory" DROP CONSTRAINT "SellerShippingCategory_shippingCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "ShippingCategory" DROP CONSTRAINT "ShippingCategory_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ShippingCategory" DROP CONSTRAINT "ShippingCategory_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "ShippingOption" DROP CONSTRAINT "ShippingOption_shippingCategoryId_fkey";

-- AlterTable
ALTER TABLE "ShippingOption" DROP COLUMN "shippingCategoryId",
ADD COLUMN     "shippingMethodId" TEXT;

-- DropTable
DROP TABLE "BidShippingCategory";

-- DropTable
DROP TABLE "SellerShippingCategory";

-- DropTable
DROP TABLE "ShippingCategory";

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "size" "Size" DEFAULT 'SMALL',
    "shippingPackageType" "ShippingPackageType" NOT NULL DEFAULT 'ENVELOPE',
    "shippingServiceType" "ShippingServiceType" NOT NULL DEFAULT 'ECONOMY',
    "createdById" TEXT,
    "lastModifiedById" TEXT,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerShippingMethod" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "shippingMethodId" TEXT NOT NULL,

    CONSTRAINT "SellerShippingMethod_pkey" PRIMARY KEY ("sellerId","shippingMethodId")
);

-- CreateTable
CREATE TABLE "BidShippingMethod" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bidId" TEXT NOT NULL,
    "shippingMethodId" TEXT NOT NULL,

    CONSTRAINT "BidShippingMethod_pkey" PRIMARY KEY ("bidId","shippingMethodId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerShippingMethod_id_key" ON "SellerShippingMethod"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BidShippingMethod_id_key" ON "BidShippingMethod"("id");

-- AddForeignKey
ALTER TABLE "ShippingMethod" ADD CONSTRAINT "ShippingMethod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingMethod" ADD CONSTRAINT "ShippingMethod_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShippingMethod" ADD CONSTRAINT "SellerShippingMethod_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShippingMethod" ADD CONSTRAINT "SellerShippingMethod_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingMethod" ADD CONSTRAINT "BidShippingMethod_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingMethod" ADD CONSTRAINT "BidShippingMethod_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
