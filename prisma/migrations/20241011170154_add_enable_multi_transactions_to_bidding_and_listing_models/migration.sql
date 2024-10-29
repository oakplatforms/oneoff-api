-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "enableMultiTransactions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "enableMultiTransactions" BOOLEAN NOT NULL DEFAULT false;
