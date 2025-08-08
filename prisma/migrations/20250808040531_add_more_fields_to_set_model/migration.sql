/*
  Warnings:

  - You are about to drop the column `image` on the `Set` table. All the data in the column will be lost.
  - Added the required column `code` to the `Set` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Set" DROP COLUMN "image",
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "logo" TEXT;
