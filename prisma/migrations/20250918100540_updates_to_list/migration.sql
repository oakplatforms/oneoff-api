/*
  Warnings:

  - The values [DEFAULT,DECK] on the enum `ListType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ListType_new" AS ENUM ('HOMEPAGE', 'COLLECTION', 'FAVORITE', 'CUSTOM');
ALTER TABLE "List" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "List" ALTER COLUMN "type" TYPE "ListType_new" USING ("type"::text::"ListType_new");
ALTER TYPE "ListType" RENAME TO "ListType_old";
ALTER TYPE "ListType_new" RENAME TO "ListType";
DROP TYPE "ListType_old";
COMMIT;

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "isPrivate" BOOLEAN DEFAULT false,
ALTER COLUMN "type" DROP DEFAULT;
