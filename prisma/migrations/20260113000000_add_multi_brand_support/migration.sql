-- CreateTable
CREATE TABLE "BrandTag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "BrandTag_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SupportedTagValue" ADD COLUMN "brandTagId" TEXT;
ALTER TABLE "SupportedTagValue" ALTER COLUMN "tagId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Set" ADD COLUMN "brandId" TEXT;

-- AlterTable
ALTER TABLE "List" ADD COLUMN "brandId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BrandTag_id_key" ON "BrandTag"("id");

-- CreateIndex
CREATE INDEX "BrandTag_brandId_idx" ON "BrandTag"("brandId");

-- CreateIndex
CREATE INDEX "BrandTag_tagId_idx" ON "BrandTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandTag_brandId_tagId_key" ON "BrandTag"("brandId", "tagId");

-- CreateIndex
CREATE INDEX "SupportedTagValue_brandTagId_idx" ON "SupportedTagValue"("brandTagId");

-- CreateIndex
CREATE INDEX "Set_brandId_idx" ON "Set"("brandId");

-- CreateIndex
CREATE INDEX "List_brandId_idx" ON "List"("brandId");

-- AddForeignKey
ALTER TABLE "BrandTag" ADD CONSTRAINT "BrandTag_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandTag" ADD CONSTRAINT "BrandTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportedTagValue" ADD CONSTRAINT "SupportedTagValue_brandTagId_fkey" FOREIGN KEY ("brandTagId") REFERENCES "BrandTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

