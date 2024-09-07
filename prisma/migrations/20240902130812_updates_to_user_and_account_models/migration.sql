-- DropIndex
DROP INDEX "Account_name_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "displayName" TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;
