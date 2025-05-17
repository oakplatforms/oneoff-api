/*
  Warnings:

  - The values [USPS_FLAT_RATE_ENVELOPE,USPS_SOFT_PACK,UPS_BOX_10KG,UPS_BOX_25KG,UPS_PAD_PAK,FEDEX_ENVELOPE,FEDEX_PADDED_PAK,FEDEX_BOX_10KG,FEDEX_BOX_25KG] on the enum `ShippingParcelType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShippingParcelType_new" AS ENUM ('USPS_FlatRateEnvelope', 'USPS_SoftPack', 'UPS_Box_10kg', 'UPS_Box_25kg', 'UPS_Pad_Pak', 'FedEx_Envelope', 'FedEx_Padded_Pak', 'FedEx_Box_10kg', 'FedEx_Box_25kg');
ALTER TABLE "ShippingMethod" ALTER COLUMN "shippingParcelTypes" TYPE "ShippingParcelType_new"[] USING ("shippingParcelTypes"::text::"ShippingParcelType_new"[]);
ALTER TYPE "ShippingParcelType" RENAME TO "ShippingParcelType_old";
ALTER TYPE "ShippingParcelType_new" RENAME TO "ShippingParcelType";
DROP TYPE "ShippingParcelType_old";
COMMIT;
