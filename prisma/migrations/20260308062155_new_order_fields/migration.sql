/*
  Warnings:

  - You are about to drop the column `shipping` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shipping",
DROP COLUMN "tax",
ADD COLUMN     "transactionFee" DECIMAL(10,2);
