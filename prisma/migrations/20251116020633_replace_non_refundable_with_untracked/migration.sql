-- Remove NON_REFUNDABLE from the enum by creating a new enum and replacing the old one
-- Convert any NON_REFUNDABLE values to UNTRACKED during the enum replacement
BEGIN;
CREATE TYPE "ShipmentAccountType_new" AS ENUM ('SHIPPO', 'UNTRACKED');
ALTER TABLE "Shipment" ALTER COLUMN "shipmentAccountType" DROP DEFAULT;
ALTER TABLE "Shipment" ALTER COLUMN "shipmentAccountType" TYPE "ShipmentAccountType_new" USING (
  CASE 
    WHEN "shipmentAccountType"::text = 'SHIPPO' THEN 'SHIPPO'::"ShipmentAccountType_new"
    ELSE 'UNTRACKED'::"ShipmentAccountType_new"  -- Maps UNTRACKED and any other values (including NON_REFUNDABLE) to UNTRACKED
  END
);
ALTER TYPE "ShipmentAccountType" RENAME TO "ShipmentAccountType_old";
ALTER TYPE "ShipmentAccountType_new" RENAME TO "ShipmentAccountType";
DROP TYPE "ShipmentAccountType_old";
ALTER TABLE "Shipment" ALTER COLUMN "shipmentAccountType" SET DEFAULT 'SHIPPO';
COMMIT;