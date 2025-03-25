/*
  Warnings:

  - The values [MARKET_MANAGER,BRAND_MANAGER,CREATOR] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `address` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `businessName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `isPremium` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessorType` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sellerAccountId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sellerAccountStatus` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sellerAccountType` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessorType` on the `Transaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AdminType" AS ENUM ('MARKET_MANAGER', 'BRAND_MANAGER');

-- CreateEnum
CREATE TYPE "PaymentAccountType" AS ENUM ('STRIPE');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('ADMIN', 'REGISTERED', 'CUSTOMER', 'SELLER');
ALTER TABLE "Account" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
ALTER TABLE "Account" ALTER COLUMN "type" SET DEFAULT 'REGISTERED';
COMMIT;

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "address",
DROP COLUMN "businessName",
DROP COLUMN "city",
DROP COLUMN "firstName",
DROP COLUMN "isPremium",
DROP COLUMN "lastName",
DROP COLUMN "paymentProcessorType",
DROP COLUMN "phone",
DROP COLUMN "sellerAccountId",
DROP COLUMN "sellerAccountStatus",
DROP COLUMN "sellerAccountType",
DROP COLUMN "state",
DROP COLUMN "website",
DROP COLUMN "zipCode",
ALTER COLUMN "type" SET DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "fullName";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "paymentProcessorType",
ADD COLUMN     "paymentAccountType" "PaymentAccountType" NOT NULL DEFAULT 'STRIPE';

-- DropEnum
DROP TYPE "PaymentProcessorType";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "paymentAccountId" TEXT,
    "paymentAccountType" "PaymentAccountType" NOT NULL DEFAULT 'STRIPE',
    "paymentAccountStatus" "ProcessStatus",
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "paymentAccountId" TEXT,
    "paymentAccountType" "PaymentAccountType" NOT NULL DEFAULT 'STRIPE',
    "paymentAccountStatus" "ProcessStatus",
    "sellerType" "SellerType",
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "businessName" TEXT,
    "website" TEXT,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_paymentAccountId_key" ON "Customer"("paymentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_accountId_key" ON "Customer"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_paymentAccountId_key" ON "Seller"("paymentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_accountId_key" ON "Seller"("accountId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
