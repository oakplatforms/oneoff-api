/*
  Warnings:

  - A unique constraint covering the columns `[ticker]` on the table `Bid` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticker]` on the table `List` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticker]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticker]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "ticker" TEXT;

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "ticker" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "ticker" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ticker" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Bid_ticker_key" ON "Bid"("ticker");

-- CreateIndex
CREATE INDEX "Bid_ticker_idx" ON "Bid"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "List_ticker_key" ON "List"("ticker");

-- CreateIndex
CREATE INDEX "List_ticker_idx" ON "List"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_ticker_key" ON "Listing"("ticker");

-- CreateIndex
CREATE INDEX "Listing_ticker_idx" ON "Listing"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Product_ticker_key" ON "Product"("ticker");

-- CreateIndex
CREATE INDEX "Product_ticker_idx" ON "Product"("ticker");
