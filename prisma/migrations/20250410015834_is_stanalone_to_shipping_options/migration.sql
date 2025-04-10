-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "hasPaymentMethod" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "hasPaymentMethod" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "ShippingOption" ADD COLUMN     "isStandalone" BOOLEAN DEFAULT false;
