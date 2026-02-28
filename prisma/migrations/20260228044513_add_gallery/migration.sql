/*
  Warnings:

  - You are about to drop the column `blurredImage` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Content` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'GALLERY';

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "blurredImage",
DROP COLUMN "image",
ADD COLUMN     "previewImage" TEXT;

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentId" TEXT NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT NOT NULL,
    "blurredImage" TEXT,
    "caption" TEXT,
    "position" INTEGER NOT NULL,
    "galleryId" TEXT NOT NULL,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_contentId_key" ON "Gallery"("contentId");

-- CreateIndex
CREATE INDEX "Gallery_contentId_idx" ON "Gallery"("contentId");

-- CreateIndex
CREATE INDEX "GalleryImage_galleryId_idx" ON "GalleryImage"("galleryId");

-- CreateIndex
CREATE INDEX "GalleryImage_galleryId_position_idx" ON "GalleryImage"("galleryId", "position");

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
