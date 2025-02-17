/*
  Warnings:

  - You are about to drop the column `createdById` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `chargedAccountId` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasedById` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `soldById` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_chargedAccountId_fkey";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "createdById";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "purchasedById" TEXT NOT NULL,
ADD COLUMN     "soldById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "chargedAccountId";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
