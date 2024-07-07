/*
  Warnings:

  - You are about to drop the column `counter` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `releaseDate` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `tcgName` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `collectionId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `deckId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tcgName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Deck` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tcg` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `brandCategoryId` to the `Card` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brandCategoryId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('TCG');

-- CreateEnum
CREATE TYPE "ColorType" AS ENUM ('RED', 'BLUE', 'PURPLE', 'GREY', 'YELLOW', 'GREEN');

-- AlterEnum
ALTER TYPE "TcgName" ADD VALUE 'POKEMON';

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_tcgName_fkey";

-- DropForeignKey
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_tcgName_fkey";

-- DropForeignKey
ALTER TABLE "Deck" DROP CONSTRAINT "Deck_tcgName_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_deckId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_tcgName_fkey";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "counter",
DROP COLUMN "description",
DROP COLUMN "releaseDate",
DROP COLUMN "tcgName",
ADD COLUMN     "art" TEXT,
ADD COLUMN     "artist" TEXT,
ADD COLUMN     "attribute" TEXT,
ADD COLUMN     "brandCategoryId" TEXT NOT NULL,
ADD COLUMN     "effect" TEXT,
ADD COLUMN     "life" INTEGER,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "power" INTEGER,
ADD COLUMN     "printing" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "collectionId",
DROP COLUMN "deckId",
DROP COLUMN "tcgName",
ADD COLUMN     "brandCategoryId" TEXT NOT NULL,
ADD COLUMN     "color" "ColorType",
ADD COLUMN     "counter" INTEGER DEFAULT 0,
ADD COLUMN     "price" TEXT,
ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "releaseDate" TIMESTAMP(3),
ADD COLUMN     "setId" TEXT;

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "Deck";

-- DropTable
DROP TABLE "Tcg";

-- DropEnum
DROP TYPE "CollectionType";

-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,

    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logo" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "fontFamily" TEXT,
    "marketplaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "marketplaceName" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "type" "CategoryType" NOT NULL DEFAULT 'TCG',
    "marketplaceName" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "displayName" TEXT,
    "brandName" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,

    CONSTRAINT "BrandCategory_pkey" PRIMARY KEY ("brandName","categoryName")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "description" TEXT,
    "brandCategoryId" TEXT NOT NULL,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_id_key" ON "Marketplace"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_name_key" ON "Marketplace"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_id_key" ON "Theme"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_marketplaceId_key" ON "Theme"("marketplaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_brandId_key" ON "Theme"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_id_key" ON "Brand"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_key" ON "Category"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BrandCategory_id_key" ON "BrandCategory"("id");

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_marketplaceName_fkey" FOREIGN KEY ("marketplaceName") REFERENCES "Marketplace"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_brandName_fkey" FOREIGN KEY ("brandName") REFERENCES "Brand"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_categoryName_fkey" FOREIGN KEY ("categoryName") REFERENCES "Category"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_brandCategoryId_fkey" FOREIGN KEY ("brandCategoryId") REFERENCES "BrandCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
