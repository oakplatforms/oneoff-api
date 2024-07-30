/*
  Warnings:

  - You are about to drop the column `counter` on the `Product` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Tcg` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "counter";

-- AlterTable
ALTER TABLE "Tcg" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "description" TEXT,
    "counter" INTEGER DEFAULT 0,
    "rarity" TEXT,
    "releaseDate" TIMESTAMP(3),
    "tcgName" TEXT,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_productId_key" ON "Card"("productId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_tcgName_fkey" FOREIGN KEY ("tcgName") REFERENCES "Tcg"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
