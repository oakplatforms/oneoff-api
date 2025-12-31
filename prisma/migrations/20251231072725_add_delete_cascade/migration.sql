-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_entityId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_entityId_fkey";

-- CreateIndex
CREATE INDEX "Entity_brandId_name_idx" ON "Entity"("brandId", "name");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
