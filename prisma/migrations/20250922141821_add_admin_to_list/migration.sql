-- AlterTable
ALTER TABLE "List" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
