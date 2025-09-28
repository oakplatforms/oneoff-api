-- AlterTable
ALTER TABLE "public"."_BidToCondition" ADD CONSTRAINT "_BidToCondition_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_BidToCondition_AB_unique";
