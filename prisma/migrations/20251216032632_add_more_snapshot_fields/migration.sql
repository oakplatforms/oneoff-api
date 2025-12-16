-- AlterTable
ALTER TABLE "OrderListing" ADD COLUMN     "price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrderShippingOption" ADD COLUMN     "maxQuantity" INTEGER,
ADD COLUMN     "rate" DECIMAL(10,2);
