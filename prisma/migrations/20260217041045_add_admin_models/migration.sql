-- CreateEnum
CREATE TYPE "AdminType" AS ENUM ('MARKET_MANAGER', 'BRAND_MANAGER');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "SupportedTagValue" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "Admin_userId_idx" ON "Admin"("userId");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValue" ADD CONSTRAINT "SupportedTagValue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValue" ADD CONSTRAINT "SupportedTagValue_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
