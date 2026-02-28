-- CreateEnum
CREATE TYPE "VideoProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "mediaConvertJobId" TEXT,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStatus" "VideoProcessingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rawUrl" TEXT;

-- CreateIndex
CREATE INDEX "Content_type_createdAt_idx" ON "Content"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Video_processingStatus_idx" ON "Video"("processingStatus");
