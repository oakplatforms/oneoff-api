/*
  Warnings:

  - You are about to drop the column `type` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_contentId_fkey";

-- DropIndex
DROP INDEX "Content_type_createdAt_idx";

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "type";

-- DropTable
DROP TABLE "Post";

-- DropEnum
DROP TYPE "ContentType";

-- CreateIndex
CREATE INDEX "Content_createdAt_idx" ON "Content"("createdAt");
