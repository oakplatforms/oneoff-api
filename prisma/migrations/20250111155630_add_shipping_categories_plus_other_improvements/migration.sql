/*
  Warnings:

  - You are about to drop the column `amount` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `shippingCategory` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Listing` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Payout` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - The `price` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ProductTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cognitoId` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `balance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_productId_fkey";

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "SupportedTagValues" DROP CONSTRAINT "SupportedTagValues_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_bidId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_accountId_fkey";

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "amount",
ADD COLUMN     "price" DECIMAL(10,2),
ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "multiTransactionsEnabled" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "shippingCategory",
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "brandCategoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "brandCategoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "amount",
ADD COLUMN     "price" DECIMAL(10,2),
ALTER COLUMN "status" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "paymentProcessingType" DROP NOT NULL,
ALTER COLUMN "paymentProcessingPayoutId" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "paymentProcessingMethodType" DROP NOT NULL,
ALTER COLUMN "paymentProcessingtMethodId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "weight" DOUBLE PRECISION,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "brandCategoryId" DROP NOT NULL,
DROP COLUMN "price",
ADD COLUMN     "price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_pkey";

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "rating" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "deliveryType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportedTagValues" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "tagId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "bidId" DROP NOT NULL,
ALTER COLUMN "listingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "cognitoId",
ADD COLUMN     "authId" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "accountId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ShippingCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "maxQuantity" INTEGER,
    "maxWeight" DOUBLE PRECISION,
    "price" DECIMAL(10,2),
    "marketplaceName" TEXT,

    CONSTRAINT "ShippingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingShippingCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingId" TEXT NOT NULL,
    "shippingCategoryId" TEXT NOT NULL,

    CONSTRAINT "ListingShippingCategory_pkey" PRIMARY KEY ("listingId","shippingCategoryId")
);

-- CreateTable
CREATE TABLE "BidShippingCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bidId" TEXT NOT NULL,
    "shippingCategoryId" TEXT NOT NULL,

    CONSTRAINT "BidShippingCategory_pkey" PRIMARY KEY ("bidId","shippingCategoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingShippingCategory_id_key" ON "ListingShippingCategory"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BidShippingCategory_id_key" ON "BidShippingCategory"("id");

-- AddForeignKey
ALTER TABLE "ShippingCategory" ADD CONSTRAINT "ShippingCategory_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValues" ADD CONSTRAINT "SupportedTagValues_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingShippingCategory" ADD CONSTRAINT "ListingShippingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingShippingCategory" ADD CONSTRAINT "ListingShippingCategory_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingCategory" ADD CONSTRAINT "BidShippingCategory_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingCategory" ADD CONSTRAINT "BidShippingCategory_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
