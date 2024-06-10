-- CreateEnum
CREATE TYPE "TcgName" AS ENUM ('ONE_PIECE');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('STRAW_HAT_CREW', 'SUPERNOVAS');

-- CreateTable
CREATE TABLE "Tcg" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "type" "TcgName" NOT NULL DEFAULT 'ONE_PIECE',

    CONSTRAINT "Tcg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "type" "CollectionType" NOT NULL,
    "tcgName" TEXT,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sku" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "tcgName" TEXT,
    "collectionName" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tcg_id_key" ON "Tcg"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Tcg_name_key" ON "Tcg"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_id_key" ON "Collection"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_name_key" ON "Collection"("name");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_tcgName_fkey" FOREIGN KEY ("tcgName") REFERENCES "Tcg"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_tcgName_fkey" FOREIGN KEY ("tcgName") REFERENCES "Tcg"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_collectionName_fkey" FOREIGN KEY ("collectionName") REFERENCES "Collection"("name") ON DELETE SET NULL ON UPDATE CASCADE;
