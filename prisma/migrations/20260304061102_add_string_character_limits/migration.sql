/*
  Warnings:

  - You are about to alter the column `name` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `displayName` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `description` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `firstName` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `lastName` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `phone` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `address` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `city` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `state` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `zipCode` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `name` on the `Entity` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `displayName` on the `Entity` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `description` on the `Entity` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `tagValue` on the `EntityTag` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `caption` on the `GalleryImage` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `name` on the `List` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `displayName` on the `List` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `description` on the `List` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `imageCaption` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `resolution` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `last4` on the `Payout` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(4)`.
  - You are about to alter the column `body` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50000)`.
  - You are about to alter the column `header` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `subheader` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(300)`.
  - You are about to alter the column `username` on the `Profile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `description` on the `Profile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `firstName` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `lastName` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `phone` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `address` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `city` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `state` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `zipCode` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `businessName` on the `Seller` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `name` on the `SupportedTagValue` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `displayName` on the `SupportedTagValue` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `description` on the `SupportedTagValue` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `name` on the `Tag` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `displayName` on the `Tag` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.

*/
-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "firstName" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "lastName" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "state" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "zipCode" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "Entity" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);

-- AlterTable
ALTER TABLE "EntityTag" ALTER COLUMN "tagValue" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "GalleryImage" ALTER COLUMN "caption" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "multiTransactionsEnabled" SET DEFAULT true,
ALTER COLUMN "imageCaption" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "resolution" SET DATA TYPE VARCHAR(1000);

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "last4" SET DATA TYPE VARCHAR(4);

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "body" SET DATA TYPE VARCHAR(50000),
ALTER COLUMN "header" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "subheader" SET DATA TYPE VARCHAR(300);

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "username" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "Seller" ALTER COLUMN "firstName" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "lastName" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "state" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "zipCode" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "businessName" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "SupportedTagValue" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(200);
