-- CreateEnum
CREATE TYPE "ShippingCarrierType" AS ENUM ('USPS', 'UPS', 'FEDEX', 'DHL');

-- CreateEnum
CREATE TYPE "ShippingPackageType" AS ENUM ('ENVELOPE', 'BOX');

-- CreateEnum
CREATE TYPE "ShippingServiceType" AS ENUM ('FLAT_RATE', 'ECONOMY', 'GROUND', 'FIRST_CLASS', 'PRIORITY', 'EXPRESS', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "shippingCarrierTypes" "ShippingCarrierType"[];

-- AlterTable
ALTER TABLE "ShippingCategory" ADD COLUMN     "shippingPackageType" "ShippingPackageType" NOT NULL DEFAULT 'ENVELOPE',
ADD COLUMN     "shippingServiceType" "ShippingServiceType" NOT NULL DEFAULT 'ECONOMY',
ADD COLUMN     "size" "Size" DEFAULT 'SMALL';
