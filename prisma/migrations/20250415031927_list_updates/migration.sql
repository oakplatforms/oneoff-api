/*
  Warnings:

  - The values [FAVORITE] on the enum `ListType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ListType_new" AS ENUM ('DEFAULT', 'COLLECTION', 'DECK');
ALTER TABLE "List" ALTER COLUMN "type" TYPE "ListType_new" USING ("type"::text::"ListType_new");
ALTER TYPE "ListType" RENAME TO "ListType_old";
ALTER TYPE "ListType_new" RENAME TO "ListType";
DROP TYPE "ListType_old";
COMMIT;

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "type" SET DEFAULT 'DEFAULT';

-- CreateTable
CREATE TABLE "EntityList" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityList_id_key" ON "EntityList"("id");

-- AddForeignKey
ALTER TABLE "EntityList" ADD CONSTRAINT "EntityList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityList" ADD CONSTRAINT "EntityList_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
