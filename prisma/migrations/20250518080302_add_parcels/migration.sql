/*
  Warnings:

  - You are about to drop the column `shippingParcelTypes` on the `ShippingMethod` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingMethodId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "externalShipmentCarrierId" TEXT,
ADD COLUMN     "externalShipmentServiceId" TEXT;

-- AlterTable
ALTER TABLE "ShippingMethod" DROP COLUMN "shippingParcelTypes";

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "carrier" "ShippingCarrierType" NOT NULL,
    "parcelType" "ShippingParcelType" NOT NULL,
    "shippingMethodId" TEXT,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
