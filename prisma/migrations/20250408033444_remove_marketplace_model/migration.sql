/*
  Warnings:

  - The values [ADMIN] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SET] on the enum `ListType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdById` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceName` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceName` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `brandCategoryId` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `listId` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `brandCategoryId` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceName` on the `ShippingCategory` table. All the data in the column will be lost.
  - You are about to drop the column `isRequired` on the `ShippingOption` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceName` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceId` on the `Theme` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the `BidCustomShippingOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BrandCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Marketplace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SellerCustomShippingOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportedTagValues` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('REGISTERED', 'CUSTOMER', 'SELLER');
ALTER TABLE "Account" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
ALTER TABLE "Account" ALTER COLUMN "type" SET DEFAULT 'REGISTERED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ListType_new" AS ENUM ('COLLECTION', 'DECK', 'FAVORITE');
ALTER TABLE "List" ALTER COLUMN "type" TYPE "ListType_new" USING ("type"::text::"ListType_new");
ALTER TYPE "ListType" RENAME TO "ListType_old";
ALTER TYPE "ListType_new" RENAME TO "ListType";
DROP TYPE "ListType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_createdById_fkey";

-- DropForeignKey
ALTER TABLE "BidCustomShippingOption" DROP CONSTRAINT "BidCustomShippingOption_bidId_fkey";

-- DropForeignKey
ALTER TABLE "BidCustomShippingOption" DROP CONSTRAINT "BidCustomShippingOption_shippingOptionId_fkey";

-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "BrandCategory" DROP CONSTRAINT "BrandCategory_brandName_fkey";

-- DropForeignKey
ALTER TABLE "BrandCategory" DROP CONSTRAINT "BrandCategory_categoryName_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_listId_fkey";

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Marketplace" DROP CONSTRAINT "Marketplace_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Marketplace" DROP CONSTRAINT "Marketplace_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_createdById_fkey";

-- DropForeignKey
ALTER TABLE "SellerCustomShippingOption" DROP CONSTRAINT "SellerCustomShippingOption_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "SellerCustomShippingOption" DROP CONSTRAINT "SellerCustomShippingOption_shippingOptionId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ShippingCategory" DROP CONSTRAINT "ShippingCategory_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ShippingCategory" DROP CONSTRAINT "ShippingCategory_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "ShippingCategory" DROP CONSTRAINT "ShippingCategory_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "ShippingOption" DROP CONSTRAINT "ShippingOption_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ShippingOption" DROP CONSTRAINT "ShippingOption_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "SupportedTagValues" DROP CONSTRAINT "SupportedTagValues_createdById_fkey";

-- DropForeignKey
ALTER TABLE "SupportedTagValues" DROP CONSTRAINT "SupportedTagValues_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "SupportedTagValues" DROP CONSTRAINT "SupportedTagValues_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_marketplaceId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_createdById_fkey";

-- DropIndex
DROP INDEX "Theme_marketplaceId_key";

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "marketplaceName";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "marketplaceName";

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "brandCategoryId",
DROP COLUMN "listId",
ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "List" DROP COLUMN "brandCategoryId",
DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "isPrivate",
ALTER COLUMN "accountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "ShippingCategory" DROP COLUMN "marketplaceName";

-- AlterTable
ALTER TABLE "ShippingOption" DROP COLUMN "isRequired";

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "marketplaceName";

-- AlterTable
ALTER TABLE "Theme" DROP COLUMN "marketplaceId";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "createdById",
ADD COLUMN     "accountId" TEXT;

-- DropTable
DROP TABLE "BidCustomShippingOption";

-- DropTable
DROP TABLE "BrandCategory";

-- DropTable
DROP TABLE "Marketplace";

-- DropTable
DROP TABLE "SellerCustomShippingOption";

-- DropTable
DROP TABLE "SupportedTagValues";

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportedTagValue" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "createdById" TEXT,
    "lastModifiedById" TEXT,
    "tagId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SellerShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "SellerShippingOption_pkey" PRIMARY KEY ("sellerId","shippingOptionId")
);

-- CreateTable
CREATE TABLE "BidShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bidId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "BidShippingOption_pkey" PRIMARY KEY ("bidId","shippingOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportedTagValue_id_key" ON "SupportedTagValue"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SellerShippingOption_id_key" ON "SellerShippingOption"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BidShippingOption_id_key" ON "BidShippingOption"("id");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCategory" ADD CONSTRAINT "ShippingCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCategory" ADD CONSTRAINT "ShippingCategory_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValue" ADD CONSTRAINT "SupportedTagValue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValue" ADD CONSTRAINT "SupportedTagValue_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValue" ADD CONSTRAINT "SupportedTagValue_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShippingOption" ADD CONSTRAINT "SellerShippingOption_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShippingOption" ADD CONSTRAINT "SellerShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingOption" ADD CONSTRAINT "BidShippingOption_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingOption" ADD CONSTRAINT "BidShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
