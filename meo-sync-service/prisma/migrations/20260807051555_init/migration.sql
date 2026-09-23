-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "externalAccountId" TEXT NOT NULL,
    "externalLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LinkMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instagramPostId" TEXT NOT NULL,
    "googleBusinessPostId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Connection_provider_key" ON "Connection"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "LinkMapping_instagramPostId_key" ON "LinkMapping"("instagramPostId");
