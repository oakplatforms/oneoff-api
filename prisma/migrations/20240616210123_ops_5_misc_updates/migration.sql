/*
  Warnings:

  - You are about to drop the `Card` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Collection` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('CARD');

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_collectionName_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_tcgName_fkey";

-- DropIndex
DROP INDEX "Collection_id_key";

-- DropIndex
DROP INDEX "Collection_name_key";

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- DropTable
DROP TABLE "Card";

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "description" TEXT,
    "tcgName" TEXT,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "description" TEXT,
    "type" "ProductType" NOT NULL,
    "sku" INTEGER NOT NULL,
    "counter" INTEGER DEFAULT 0,
    "tcgName" TEXT,
    "deckId" TEXT,
    "collectionId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_tcgName_fkey" FOREIGN KEY ("tcgName") REFERENCES "Tcg"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tcgName_fkey" FOREIGN KEY ("tcgName") REFERENCES "Tcg"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
