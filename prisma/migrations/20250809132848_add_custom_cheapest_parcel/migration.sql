/*
  Warnings:

  - The values [USPS_First_Class_Package_Service] on the enum `ShippingParcelType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Set` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShippingParcelType_new" AS ENUM ('Custom_Cheapest', 'USPS_FlatRateEnvelope', 'USPS_GroundAdvantage', 'USPS_SoftPack', 'UPS_Box_10kg', 'UPS_Box_25kg', 'UPS_Pad_Pak', 'FedEx_Envelope', 'FedEx_Padded_Pak', 'FedEx_Box_10kg', 'FedEx_Box_25kg');
ALTER TABLE "Parcel" ALTER COLUMN "type" TYPE "ShippingParcelType_new" USING ("type"::text::"ShippingParcelType_new");
ALTER TYPE "ShippingParcelType" RENAME TO "ShippingParcelType_old";
ALTER TYPE "ShippingParcelType_new" RENAME TO "ShippingParcelType";
DROP TYPE "ShippingParcelType_old";
COMMIT;

-- CreateIndex
CREATE UNIQUE INDEX "Set_name_key" ON "Set"("name");
