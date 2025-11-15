-- AlterTable
ALTER TABLE "public"."ShippingMethod" ADD COLUMN     "fixedRate" DECIMAL(10,2),
ADD COLUMN     "maxQuantity" INTEGER,
ADD COLUMN     "warning" TEXT;
