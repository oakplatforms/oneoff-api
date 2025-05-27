/*
  Warnings:

  - You are about to drop the column `taxRate` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "taxRate";

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "taxRate" DECIMAL(10,2);
