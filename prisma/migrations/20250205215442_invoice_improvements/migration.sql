/*
  Warnings:

  - You are about to drop the column `paymentProcessingMethodType` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingPayoutId` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingType` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingtMethodId` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `subTotal` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Transaction` table. All the data in the column will be lost.
  - Made the column `status` on table `Bid` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quantity` on table `Bid` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `Bid` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marketplaceName` on table `Brand` required. This step will fail if there are existing NULL values in that column.
  - Made the column `productId` on table `Card` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brandCategoryId` on table `Card` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marketplaceName` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `List` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brandCategoryId` on table `List` required. This step will fail if there are existing NULL values in that column.
  - Made the column `profileId` on table `List` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Listing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quantity` on table `Listing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `Listing` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `invoiceId` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Made the column `walletId` on table `Payout` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brandCategoryId` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rating` on table `Review` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `Review` required. This step will fail if there are existing NULL values in that column.
  - Made the column `profileId` on table `Review` required. This step will fail if there are existing NULL values in that column.
  - Made the column `productId` on table `Review` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deliveryType` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deliveryMethodType` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `ShippingCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marketplaceName` on table `ShippingCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `ShippingOption` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rate` on table `ShippingOption` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `SupportedTagValues` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tagId` on table `SupportedTagValues` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marketplaceName` on table `Tag` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `accountId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `status` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `authId` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `balance` on table `Wallet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `accountId` on table `Wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('COMPLETED', 'PENDING', 'CANCELED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ORDER', 'PAYOUT');

-- CreateEnum
CREATE TYPE "PaymentProcessorType" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'APPLE_PAY');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'CAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeliveryMethodType" ADD VALUE 'NEXT_DAY_AIR';
ALTER TYPE "DeliveryMethodType" ADD VALUE 'EXPRESS';
ALTER TYPE "DeliveryMethodType" ADD VALUE 'IN_PERSON';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionStatus" ADD VALUE 'FAILED';
ALTER TYPE "TransactionStatus" ADD VALUE 'REQUIRES_ACTION';

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_productId_fkey";

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_profileId_fkey";

-- DropForeignKey
ALTER TABLE "BidCustomShippingOption" DROP CONSTRAINT "BidCustomShippingOption_bidId_fkey";

-- DropForeignKey
ALTER TABLE "BidCustomShippingOption" DROP CONSTRAINT "BidCustomShippingOption_shippingOptionId_fkey";

-- DropForeignKey
ALTER TABLE "BidShippingCategory" DROP CONSTRAINT "BidShippingCategory_bidId_fkey";

-- DropForeignKey
ALTER TABLE "BidShippingCategory" DROP CONSTRAINT "BidShippingCategory_shippingCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "BrandCategory" DROP CONSTRAINT "BrandCategory_brandName_fkey";

-- DropForeignKey
ALTER TABLE "BrandCategory" DROP CONSTRAINT "BrandCategory_categoryName_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_productId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_productId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_profileId_fkey";

-- DropForeignKey
ALTER TABLE "ListingCustomShippingOption" DROP CONSTRAINT "ListingCustomShippingOption_listingId_fkey";

-- DropForeignKey
ALTER TABLE "ListingCustomShippingOption" DROP CONSTRAINT "ListingCustomShippingOption_shippingOptionId_fkey";

-- DropForeignKey
ALTER TABLE "ListingShippingCategory" DROP CONSTRAINT "ListingShippingCategory_listingId_fkey";

-- DropForeignKey
ALTER TABLE "ListingShippingCategory" DROP CONSTRAINT "ListingShippingCategory_shippingCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_walletId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_listId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "ShippingCategory" DROP CONSTRAINT "ShippingCategory_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "ShippingOption" DROP CONSTRAINT "ShippingOption_shippingCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "SupportedTagValues" DROP CONSTRAINT "SupportedTagValues_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_marketplaceName_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_marketplaceId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_accountId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "paymentCustomerId" TEXT,
ADD COLUMN     "paymentProcessorType" "PaymentProcessorType" NOT NULL DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "Bid" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL;

-- AlterTable
ALTER TABLE "Brand" ALTER COLUMN "marketplaceName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "productId" SET NOT NULL,
ALTER COLUMN "brandCategoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "marketplaceName" SET NOT NULL;

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "brandCategoryId" SET NOT NULL,
ALTER COLUMN "profileId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "paymentProcessingMethodType",
DROP COLUMN "paymentProcessingPayoutId",
DROP COLUMN "paymentProcessingType",
DROP COLUMN "paymentProcessingtMethodId",
DROP COLUMN "price",
ADD COLUMN     "invoiceId" TEXT NOT NULL,
ADD COLUMN     "subTotal" DECIMAL(10,2),
ADD COLUMN     "tax" DECIMAL(10,2),
ADD COLUMN     "taxRate" DECIMAL(10,2),
ADD COLUMN     "total" DECIMAL(10,2),
DROP COLUMN "status",
ADD COLUMN     "status" "ProcessStatus" NOT NULL,
ALTER COLUMN "walletId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'CARD',
ALTER COLUMN "brandCategoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "rating" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "profileId" SET NOT NULL,
ALTER COLUMN "productId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "deliveryType" SET NOT NULL,
ALTER COLUMN "deliveryMethodType" SET NOT NULL;

-- AlterTable
ALTER TABLE "ShippingCategory" ADD COLUMN     "deliveryMethodType" "DeliveryMethodType" DEFAULT 'ECONOMY',
ADD COLUMN     "deliveryType" "DeliveryType" DEFAULT 'USPS',
ADD COLUMN     "level" DOUBLE PRECISION,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "marketplaceName" SET NOT NULL;

-- AlterTable
ALTER TABLE "ShippingOption" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "rate" SET NOT NULL;

-- AlterTable
ALTER TABLE "SupportedTagValues" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "tagId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "marketplaceName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "subTotal",
DROP COLUMN "tax",
DROP COLUMN "total",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentMethodType" "PaymentMethodType" NOT NULL DEFAULT 'CARD',
ADD COLUMN     "paymentProcessorType" "PaymentProcessorType" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "payoutId" TEXT,
ADD COLUMN     "refundedAmount" DECIMAL(10,2),
ADD COLUMN     "transactionType" "TransactionType" NOT NULL DEFAULT 'ORDER',
ALTER COLUMN "status" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "authId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "balance" SET NOT NULL,
ALTER COLUMN "accountId" SET NOT NULL;

-- DropEnum
DROP TYPE "PaymentProcessingMethodType";

-- DropEnum
DROP TYPE "PaymentProcessingType";

-- DropEnum
DROP TYPE "PayoutStatus";

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ProcessStatus" NOT NULL,
    "subTotal" DECIMAL(10,2),
    "taxRate" DECIMAL(10,2),
    "tax" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCategory" ADD CONSTRAINT "ShippingCategory_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingOption" ADD CONSTRAINT "ShippingOption_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValues" ADD CONSTRAINT "SupportedTagValues_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_brandName_fkey" FOREIGN KEY ("brandName") REFERENCES "Brand"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_categoryName_fkey" FOREIGN KEY ("categoryName") REFERENCES "Category"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingShippingCategory" ADD CONSTRAINT "ListingShippingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingShippingCategory" ADD CONSTRAINT "ListingShippingCategory_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCustomShippingOption" ADD CONSTRAINT "ListingCustomShippingOption_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCustomShippingOption" ADD CONSTRAINT "ListingCustomShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingCategory" ADD CONSTRAINT "BidShippingCategory_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidShippingCategory" ADD CONSTRAINT "BidShippingCategory_shippingCategoryId_fkey" FOREIGN KEY ("shippingCategoryId") REFERENCES "ShippingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidCustomShippingOption" ADD CONSTRAINT "BidCustomShippingOption_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidCustomShippingOption" ADD CONSTRAINT "BidCustomShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
