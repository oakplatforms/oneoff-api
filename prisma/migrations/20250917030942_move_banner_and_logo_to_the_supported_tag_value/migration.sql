/*
  Warnings:

  - You are about to drop the column `banner` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `Tag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SupportedTagValue" ADD COLUMN     "banner" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "banner",
DROP COLUMN "description",
DROP COLUMN "logo";
