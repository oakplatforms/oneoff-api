/*
  Warnings:

  - You are about to drop the column `createdById` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `purchasedById` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `soldById` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `trackingNumber` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `maxQuantity` on the `ShippingOption` table. All the data in the column will be lost.
  - You are about to drop the column `maxWeight` on the `ShippingOption` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rate` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShipmentAccountType" AS ENUM ('EASY_POST');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('OUTBOUND', 'RETURN');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_purchasedById_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_soldById_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_transactionId_fkey";

-- DropIndex
DROP INDEX "Shipment_transactionId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "createdById",
DROP COLUMN "purchasedById",
DROP COLUMN "soldById",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "accountId",
DROP COLUMN "fee",
DROP COLUMN "trackingNumber",
DROP COLUMN "transactionId",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "externalShipmentId" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "rate" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "shipmentAccountType" "ShipmentAccountType" NOT NULL DEFAULT 'EASY_POST',
ADD COLUMN     "shippingMethodId" TEXT,
ADD COLUMN     "status" "ProcessStatus" NOT NULL,
ADD COLUMN     "type" "ShipmentType" NOT NULL DEFAULT 'OUTBOUND';

-- AlterTable
ALTER TABLE "ShippingMethod" DROP COLUMN "size",
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "length" DOUBLE PRECISION,
ADD COLUMN     "maxQuantity" INTEGER,
ADD COLUMN     "width" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ShippingOption" DROP COLUMN "maxQuantity",
DROP COLUMN "maxWeight",
ADD COLUMN     "weight" DOUBLE PRECISION;

-- DropEnum
DROP TYPE "Size";

-- CreateTable
CREATE TABLE "ShipmentShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "ShipmentShippingOption_pkey" PRIMARY KEY ("shipmentId","shippingOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentShippingOption_id_key" ON "ShipmentShippingOption"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentShippingOption" ADD CONSTRAINT "ShipmentShippingOption_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentShippingOption" ADD CONSTRAINT "ShipmentShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
