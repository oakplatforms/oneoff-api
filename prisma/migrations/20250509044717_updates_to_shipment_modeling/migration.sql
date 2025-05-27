/*
  Warnings:

  - The values [EASY_POST] on the enum `ShipmentAccountType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `shippingMethodId` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `length` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `maxQuantity` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the `ShipmentShippingOption` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ShippingParcelType" AS ENUM ('USPS_FlatRateEnvelope', 'USPS_FlatRateLegalEnvelope', 'USPS_FlatRatePaddedEnvelope', 'USPS_SmallFlatRateEnvelope', 'USPS_SmallFlatRateBox', 'USPS_SoftPack', 'UPS_Box_10kg', 'UPS_Box_25kg', 'UPS_Pad_Pak', 'FedEx_Envelope', 'FedEx_Padded_Pak', 'FedEx_Box_10kg', 'FedEx_Box_25kg');

-- AlterEnum
BEGIN;
CREATE TYPE "ShipmentAccountType_new" AS ENUM ('SHIPPO');
ALTER TABLE "Shipment" ALTER COLUMN "shipmentAccountType" DROP DEFAULT;
ALTER TABLE "Shipment" ALTER COLUMN "shipmentAccountType" TYPE "ShipmentAccountType_new" USING ("shipmentAccountType"::text::"ShipmentAccountType_new");
ALTER TYPE "ShipmentAccountType" RENAME TO "ShipmentAccountType_old";
ALTER TYPE "ShipmentAccountType_new" RENAME TO "ShipmentAccountType";
DROP TYPE "ShipmentAccountType_old";
ALTER TABLE "Shipment" ALTER COLUMN "shipmentAccountType" SET DEFAULT 'SHIPPO';
COMMIT;

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_shippingMethodId_fkey";

-- DropForeignKey
ALTER TABLE "ShipmentShippingOption" DROP CONSTRAINT "ShipmentShippingOption_shipmentId_fkey";

-- DropForeignKey
ALTER TABLE "ShipmentShippingOption" DROP CONSTRAINT "ShipmentShippingOption_shippingOptionId_fkey";

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "shippingMethodId",
ALTER COLUMN "shipmentAccountType" SET DEFAULT 'SHIPPO';

-- AlterTable
ALTER TABLE "ShippingMethod" DROP COLUMN "height",
DROP COLUMN "length",
DROP COLUMN "maxQuantity",
DROP COLUMN "width",
ADD COLUMN     "shippingParcelTypes" "ShippingParcelType"[];

-- DropTable
DROP TABLE "ShipmentShippingOption";

-- CreateTable
CREATE TABLE "OrderShippingOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "shippingOptionId" TEXT NOT NULL,

    CONSTRAINT "OrderShippingOption_pkey" PRIMARY KEY ("orderId","shippingOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderShippingOption_id_key" ON "OrderShippingOption"("id");

-- AddForeignKey
ALTER TABLE "OrderShippingOption" ADD CONSTRAINT "OrderShippingOption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShippingOption" ADD CONSTRAINT "OrderShippingOption_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "ShippingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
