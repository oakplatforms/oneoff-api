/*
  Warnings:

  - You are about to drop the column `parcelType` on the `Parcel` table. All the data in the column will be lost.
  - Added the required column `type` to the `Parcel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Parcel" DROP COLUMN "parcelType",
ADD COLUMN     "type" "ShippingParcelType" NOT NULL;
