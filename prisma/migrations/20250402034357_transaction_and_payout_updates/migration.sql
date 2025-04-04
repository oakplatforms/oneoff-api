/*
  Warnings:

  - The values [ORDER] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `invoiceId` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `subTotal` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `taxRate` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `walletId` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('ORDER_PAYMENT', 'ORDER_REFUND', 'PAYOUT');
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" TYPE "TransactionType_new" USING ("transactionType"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" SET DEFAULT 'ORDER_PAYMENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_walletId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_accountId_fkey";

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "invoiceId",
DROP COLUMN "subTotal",
DROP COLUMN "tax",
DROP COLUMN "taxRate",
DROP COLUMN "walletId",
ADD COLUMN     "last4" TEXT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "status",
ALTER COLUMN "transactionType" SET DEFAULT 'ORDER_PAYMENT';

-- DropTable
DROP TABLE "Wallet";

-- DropEnum
DROP TYPE "TransactionStatus";
