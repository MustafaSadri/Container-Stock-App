-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "group" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Flavour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT,
    "code" TEXT,
    "costPrice" REAL,
    "salePrice" REAL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Flavour_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flavourId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_flavourId_fkey" FOREIGN KEY ("flavourId") REFERENCES "Flavour" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockItem_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "flavourId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sourceContainerId" TEXT,
    "destContainerId" TEXT,
    "previousStockSource" INTEGER,
    "newStockSource" INTEGER,
    "previousStockDest" INTEGER,
    "newStockDest" INTEGER,
    "note" TEXT,
    "reference" TEXT,
    "batchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_flavourId_fkey" FOREIGN KEY ("flavourId") REFERENCES "Flavour" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_sourceContainerId_fkey" FOREIGN KEY ("sourceContainerId") REFERENCES "Container" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_destContainerId_fkey" FOREIGN KEY ("destContainerId") REFERENCES "Container" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Container_name_key" ON "Container"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Flavour_code_key" ON "Flavour"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Flavour_productId_nameEn_key" ON "Flavour"("productId", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_flavourId_containerId_key" ON "StockItem"("flavourId", "containerId");

-- CreateIndex
CREATE INDEX "Transaction_flavourId_idx" ON "Transaction"("flavourId");

-- CreateIndex
CREATE INDEX "Transaction_sourceContainerId_idx" ON "Transaction"("sourceContainerId");

-- CreateIndex
CREATE INDEX "Transaction_destContainerId_idx" ON "Transaction"("destContainerId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_batchId_idx" ON "Transaction"("batchId");
