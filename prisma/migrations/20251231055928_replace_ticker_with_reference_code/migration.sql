/*
  Warnings:

  - You are about to drop the column `ticker` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `ticker` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `ticker` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `ticker` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[referenceCode]` on the table `Bid` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referenceCode]` on the table `List` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referenceCode]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referenceCode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Bid_ticker_idx";

-- DropIndex
DROP INDEX "Bid_ticker_key";

-- DropIndex
DROP INDEX "List_ticker_idx";

-- DropIndex
DROP INDEX "List_ticker_key";

-- DropIndex
DROP INDEX "Listing_ticker_idx";

-- DropIndex
DROP INDEX "Listing_ticker_key";

-- DropIndex
DROP INDEX "Product_ticker_idx";

-- DropIndex
DROP INDEX "Product_ticker_key";

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "ticker",
ADD COLUMN     "referenceCode" TEXT;

-- AlterTable
ALTER TABLE "List" DROP COLUMN "ticker",
ADD COLUMN     "referenceCode" TEXT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "ticker",
ADD COLUMN     "referenceCode" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "ticker",
ADD COLUMN     "referenceCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Bid_referenceCode_key" ON "Bid"("referenceCode");

-- CreateIndex
CREATE INDEX "Bid_referenceCode_idx" ON "Bid"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "List_referenceCode_key" ON "List"("referenceCode");

-- CreateIndex
CREATE INDEX "List_referenceCode_idx" ON "List"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_referenceCode_key" ON "Listing"("referenceCode");

-- CreateIndex
CREATE INDEX "Listing_referenceCode_idx" ON "Listing"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_referenceCode_key" ON "Product"("referenceCode");

-- CreateIndex
CREATE INDEX "Product_referenceCode_idx" ON "Product"("referenceCode");
