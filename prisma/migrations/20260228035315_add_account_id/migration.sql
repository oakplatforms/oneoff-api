-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "accountId" TEXT;

-- CreateIndex
CREATE INDEX "Content_accountId_idx" ON "Content"("accountId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
