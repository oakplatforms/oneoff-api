-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "sellerSnapshot" JSONB;
