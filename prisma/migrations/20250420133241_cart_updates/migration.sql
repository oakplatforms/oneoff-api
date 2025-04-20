/*
  Warnings:

  - You are about to drop the column `status` on the `Cart` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ProcessStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "status",
ALTER COLUMN "isPrimary" SET DEFAULT false;

-- AlterTable
ALTER TABLE "ShippingOption" ADD COLUMN     "maxQuantity" INTEGER;
