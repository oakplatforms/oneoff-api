/*
  Warnings:

  - You are about to drop the column `displayName` on the `BrandCategory` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `BrandCategory` table. All the data in the column will be lost.
  - You are about to drop the column `art` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `artist` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `attribute` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `effect` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `life` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `power` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `printing` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `rarity` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `counter` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productImage` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `setId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `fontFamily` on the `Theme` table. All the data in the column will be lost.
  - You are about to drop the `Set` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('SET', 'DECK');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_setId_fkey";

-- DropForeignKey
ALTER TABLE "Set" DROP CONSTRAINT "Set_brandCategoryId_fkey";

-- AlterTable
ALTER TABLE "BrandCategory" DROP COLUMN "displayName",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "art",
DROP COLUMN "artist",
DROP COLUMN "attribute",
DROP COLUMN "displayName",
DROP COLUMN "effect",
DROP COLUMN "life",
DROP COLUMN "name",
DROP COLUMN "power",
DROP COLUMN "printing",
DROP COLUMN "rarity",
ADD COLUMN     "shippingCategory" TEXT;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "color",
DROP COLUMN "counter",
DROP COLUMN "productImage",
DROP COLUMN "setId",
DROP COLUMN "sku",
ADD COLUMN     "collectionId" TEXT,
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Theme" DROP COLUMN "fontFamily";

-- DropTable
DROP TABLE "Set";

-- DropEnum
DROP TYPE "CategoryType";

-- DropEnum
DROP TYPE "ColorType";

-- DropEnum
DROP TYPE "TcgName";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cognitoId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "marketplaceName" TEXT
);

-- CreateTable
CREATE TABLE "SupportedTagValues" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "tagName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tagValue" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("tagName","productId")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "description" TEXT,
    "type" "CollectionType" NOT NULL,
    "brandCategoryId" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_id_key" ON "Tag"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SupportedTagValues_id_key" ON "SupportedTagValues"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTag_id_key" ON "ProductTag"("id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValues" ADD CONSTRAINT "SupportedTagValues_tagName_fkey" FOREIGN KEY ("tagName") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagName_fkey" FOREIGN KEY ("tagName") REFERENCES "Tag"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
