-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('MINT', 'LIKE_NEW', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "condition" "Condition" NOT NULL DEFAULT 'MINT',
ADD COLUMN     "isPrimary" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Marketplace" ADD COLUMN     "hasMultiSellerEnabled" BOOLEAN DEFAULT false;
