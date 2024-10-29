/*
  Warnings:

  - You are about to alter the column `amount` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `fee` on the `Shipment` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `subTotal` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `tax` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `total` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Bid" ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "fee" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "subTotal" DROP NOT NULL,
ALTER COLUMN "subTotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "total" DROP NOT NULL,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2);
