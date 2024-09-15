/*
  Warnings:

  - You are about to drop the column `displayName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Account` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "displayName",
DROP COLUMN "name",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");
