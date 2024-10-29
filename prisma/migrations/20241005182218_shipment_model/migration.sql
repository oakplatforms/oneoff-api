/*
  Warnings:

  - You are about to drop the column `deliveryMethodType` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `trackingNumber` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingCustomerId` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingMethodType` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingType` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessingtMethodId` on the `Wallet` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `Bid` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Listing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentProcessingtMethodId` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('USPS', 'UPS', 'FEDEX', 'IN_PERSON');

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "quantity" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "quantity" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "paymentProcessingMethodType" "PaymentProcessingMethodType" NOT NULL DEFAULT 'CARD',
ADD COLUMN     "paymentProcessingtMethodId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "deliveryMethodType",
DROP COLUMN "trackingNumber";

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "paymentProcessingCustomerId",
DROP COLUMN "paymentProcessingMethodType",
DROP COLUMN "paymentProcessingType",
DROP COLUMN "paymentProcessingtMethodId";

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fee" INTEGER,
    "deliveryType" "DeliveryType" NOT NULL,
    "deliveryMethodType" "DeliveryMethodType",
    "trackingNumber" TEXT,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_transactionId_key" ON "Shipment"("transactionId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
