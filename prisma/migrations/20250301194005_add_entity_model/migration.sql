/*
  Warnings:

  - The values [STANDARD] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `productId` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `brandCategoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `listId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the `Card` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTag` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[entityId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entityId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PRODUCT', 'SERVICE', 'CONTENT');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('ADMIN', 'MARKET_MANAGER', 'BRAND_MANAGER', 'CUSTOMER', 'SELLER');
ALTER TABLE "Account" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
ALTER TABLE "Account" ALTER COLUMN "type" SET DEFAULT 'CUSTOMER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_productId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_productId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_brandCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_listId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "type" SET DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "productId",
ADD COLUMN     "entityId" TEXT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "productId",
ADD COLUMN     "entityId" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "brandCategoryId",
DROP COLUMN "description",
DROP COLUMN "displayName",
DROP COLUMN "image",
DROP COLUMN "listId",
DROP COLUMN "name",
DROP COLUMN "price",
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "sku" TEXT;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "productId",
ADD COLUMN     "entityId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Card";

-- DropTable
DROP TABLE "ProductTag";

-- CreateTable
CREATE TABLE "EntityTag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tagValue" TEXT NOT NULL,
    "isPrimary" BOOLEAN,
    "index" INTEGER,
    "tagId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "type" "EntityType" NOT NULL DEFAULT 'PRODUCT',
    "image" TEXT,
    "brandCategoryId" TEXT NOT NULL,
    "listId" TEXT,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityTag_id_key" ON "EntityTag"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_entityId_key" ON "Product"("entityId");

-- AddForeignKey
ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
