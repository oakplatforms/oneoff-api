/*
  Warnings:

  - The values [FLAT_RATE,ECONOMY,FIRST_CLASS,OVERNIGHT] on the enum `ShippingServiceType` will be removed. If these variants are still used in the database, this will fail.
  - The values [ORDER_PAYMENT,ORDER_REFUND] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `BidShippingMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BidShippingOption` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'EVENT';

-- AlterEnum
ALTER TYPE "ShippingPackageType" ADD VALUE 'BUBBLE_MAILER';

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingServiceType_new" AS ENUM ('STANDARD', 'GROUND', 'PRIORITY', 'EXPRESS');
ALTER TABLE "ShippingMethod" ALTER COLUMN "shippingServiceType" DROP DEFAULT;
ALTER TABLE "ShippingMethod" ALTER COLUMN "shippingServiceType" TYPE "ShippingServiceType_new" USING ("shippingServiceType"::text::"ShippingServiceType_new");
ALTER TYPE "ShippingServiceType" RENAME TO "ShippingServiceType_old";
ALTER TYPE "ShippingServiceType_new" RENAME TO "ShippingServiceType";
DROP TYPE "ShippingServiceType_old";
ALTER TABLE "ShippingMethod" ALTER COLUMN "shippingServiceType" SET DEFAULT 'STANDARD';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('PAYMENT', 'REFUND', 'PAYOUT');
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" TYPE "TransactionType_new" USING ("transactionType"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" SET DEFAULT 'PAYMENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "BidShippingMethod" DROP CONSTRAINT "BidShippingMethod_bidId_fkey";

-- DropForeignKey
ALTER TABLE "BidShippingMethod" DROP CONSTRAINT "BidShippingMethod_shippingMethodId_fkey";

-- DropForeignKey
ALTER TABLE "BidShippingOption" DROP CONSTRAINT "BidShippingOption_bidId_fkey";

-- DropForeignKey
ALTER TABLE "BidShippingOption" DROP CONSTRAINT "BidShippingOption_shippingOptionId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "length" DOUBLE PRECISION,
ADD COLUMN     "width" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ShippingMethod" ALTER COLUMN "size" DROP DEFAULT,
ALTER COLUMN "shippingServiceType" SET DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" SET DEFAULT 'PAYMENT';

-- DropTable
DROP TABLE "BidShippingMethod";

-- DropTable
DROP TABLE "BidShippingOption";
