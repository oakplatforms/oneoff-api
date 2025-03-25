/*
  Warnings:

  - You are about to drop the column `paymentCustomerId` on the `Account` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'CREATOR';

-- AlterEnum
ALTER TYPE "ProcessStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "paymentCustomerId",
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "sellerAccountId" TEXT,
ADD COLUMN     "sellerAccountStatus" "ProcessStatus",
ADD COLUMN     "sellerAccountType" "SellerType",
ADD COLUMN     "website" TEXT;
