-- Phase 1 multi-site foundation. Restaurant links stay nullable so existing
-- single-site rows remain valid while application code is migrated gradually.
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Campus_slug_key" ON "Campus"("slug");

CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Restaurant_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Restaurant_campusId_slug_key" ON "Restaurant"("campusId", "slug");

-- Account and Session are deliberately separate from User to keep the existing
-- demo identities usable until the authentication rollout completes.
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "campusId" TEXT,
    "restaurantId" TEXT,
    "createdById" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invitation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Invitation_campusId_idx" ON "Invitation"("campusId");
CREATE INDEX "Invitation_restaurantId_idx" ON "Invitation"("restaurantId");

ALTER TABLE "User" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meal" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Slot" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KitchenBatch" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Forecast" ADD COLUMN "restaurantId" TEXT REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_restaurantId_idx" ON "User"("restaurantId");
CREATE INDEX "Meal_restaurantId_idx" ON "Meal"("restaurantId");
CREATE INDEX "MenuItem_restaurantId_idx" ON "MenuItem"("restaurantId");
CREATE INDEX "Slot_restaurantId_idx" ON "Slot"("restaurantId");
CREATE INDEX "Reservation_restaurantId_idx" ON "Reservation"("restaurantId");
CREATE INDEX "KitchenBatch_restaurantId_idx" ON "KitchenBatch"("restaurantId");
CREATE INDEX "Forecast_restaurantId_idx" ON "Forecast"("restaurantId");

CREATE TABLE "BalanceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "reservationId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BalanceLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BalanceLedger_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BalanceLedger_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BalanceLedger_userId_createdAt_idx" ON "BalanceLedger"("userId", "createdAt");
CREATE INDEX "BalanceLedger_restaurantId_createdAt_idx" ON "BalanceLedger"("restaurantId", "createdAt");
CREATE INDEX "BalanceLedger_reservationId_idx" ON "BalanceLedger"("reservationId");
