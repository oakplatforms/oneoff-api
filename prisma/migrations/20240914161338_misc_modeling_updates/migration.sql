/*
  Warnings:

  - The primary key for the `ProductTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tagName` on the `ProductTag` table. All the data in the column will be lost.
  - You are about to drop the column `tagName` on the `SupportedTagValues` table. All the data in the column will be lost.
  - Added the required column `tagId` to the `ProductTag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tagId` to the `SupportedTagValues` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "CollectionType" ADD VALUE 'FAVORITES';

-- DropForeignKey
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_tagName_fkey";

-- DropForeignKey
ALTER TABLE "SupportedTagValues" DROP CONSTRAINT "SupportedTagValues_tagName_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "isPrivate" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_pkey",
DROP COLUMN "tagName",
ADD COLUMN     "tagId" TEXT NOT NULL,
ADD CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("tagId", "productId");

-- AlterTable
ALTER TABLE "SupportedTagValues" DROP COLUMN "tagName",
ADD COLUMN     "tagId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SupportedTagValues" ADD CONSTRAINT "SupportedTagValues_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
