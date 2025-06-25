-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('UNKNOWN', 'PRE_TRANSIT', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILURE');

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "secondaryImage" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shipping" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "trackingStatus" "TrackingStatus" DEFAULT 'UNKNOWN';
