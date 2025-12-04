-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "paymentIntentId" TEXT;
