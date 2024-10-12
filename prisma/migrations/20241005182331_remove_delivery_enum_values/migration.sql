/*
  Warnings:

  - The values [LOCAL_DELIVERY,IN_PERSON] on the enum `DeliveryMethodType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryMethodType_new" AS ENUM ('FIRST_CLASS_MAIL', 'OVERNIGHT', 'PRIORITY', 'FLAT_RATE', 'ECONOMY', 'INTERNATIONAL');
ALTER TABLE "Shipment" ALTER COLUMN "deliveryMethodType" TYPE "DeliveryMethodType_new" USING ("deliveryMethodType"::text::"DeliveryMethodType_new");
ALTER TYPE "DeliveryMethodType" RENAME TO "DeliveryMethodType_old";
ALTER TYPE "DeliveryMethodType_new" RENAME TO "DeliveryMethodType";
DROP TYPE "DeliveryMethodType_old";
COMMIT;
