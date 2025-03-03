/*
  Warnings:

  - The values [LIKE_NEW,EXCELLENT] on the enum `Condition` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Condition_new" AS ENUM ('MINT', 'NEAR_MINT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');
ALTER TABLE "Listing" ALTER COLUMN "condition" DROP DEFAULT;
ALTER TABLE "Listing" ALTER COLUMN "condition" TYPE "Condition_new" USING ("condition"::text::"Condition_new");
ALTER TYPE "Condition" RENAME TO "Condition_old";
ALTER TYPE "Condition_new" RENAME TO "Condition";
DROP TYPE "Condition_old";
ALTER TABLE "Listing" ALTER COLUMN "condition" SET DEFAULT 'MINT';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN DEFAULT false;
