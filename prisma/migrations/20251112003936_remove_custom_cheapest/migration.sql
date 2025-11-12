/*
  Warnings:

  - The values [Custom_Cheapest] on the enum `ShippingParcelType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ShippingParcelType_new" AS ENUM ('USPS_FlatRateEnvelope', 'USPS_GroundAdvantage', 'USPS_SoftPack', 'UPS_Box_10kg', 'UPS_Box_25kg', 'UPS_Pad_Pak', 'FedEx_Envelope', 'FedEx_Padded_Pak', 'FedEx_Box_10kg', 'FedEx_Box_25kg');
ALTER TABLE "public"."Parcel" ALTER COLUMN "type" TYPE "public"."ShippingParcelType_new" USING ("type"::text::"public"."ShippingParcelType_new");
ALTER TYPE "public"."ShippingParcelType" RENAME TO "ShippingParcelType_old";
ALTER TYPE "public"."ShippingParcelType_new" RENAME TO "ShippingParcelType";
DROP TYPE "public"."ShippingParcelType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."ShippingMethod" ADD COLUMN     "isTracked" BOOLEAN DEFAULT true;
