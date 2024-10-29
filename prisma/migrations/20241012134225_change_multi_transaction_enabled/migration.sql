/*
  Warnings:

  - You are about to drop the column `enableMultiTransactions` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `enableMultiTransactions` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "enableMultiTransactions",
ADD COLUMN     "multiTransactionsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "enableMultiTransactions",
ADD COLUMN     "multiTransactionsEnabled" BOOLEAN NOT NULL DEFAULT false;
