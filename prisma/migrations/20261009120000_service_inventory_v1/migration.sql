-- CrousFlow v1 service publishing, physical stock and idempotent withdrawal.
-- Additive migration: legacy menu items and reservations remain readable.

ALTER TABLE "Meal" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Meal" ADD COLUMN "sideCategory" TEXT;

CREATE TABLE "ServiceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "serviceDate" DATETIME NOT NULL,
    "serviceKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reservationClosingAt" DATETIME NOT NULL,
    "cancellationClosingAt" DATETIME NOT NULL,
    "bookingClosedAt" DATETIME,
    "closedAt" DATETIME,
    "closeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ServiceOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    "committedQuantity" INTEGER NOT NULL DEFAULT 0,
    "physicalQuantity" INTEGER NOT NULL DEFAULT 0,
    "allocatedQuantity" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceOffer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOffer_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Reception" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reception_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reception_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ReceptionLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receptionId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "acceptedQuantity" INTEGER NOT NULL,
    "lot" TEXT,
    "bestBefore" DATETIME,
    "observation" TEXT,
    CONSTRAINT "ReceptionLine_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "Reception" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceptionLine_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ServiceOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "operationKey" TEXT,
    "referenceId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ServiceOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "StockAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAllocation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockAllocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockAllocation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ServiceOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "Slot" ADD COLUMN "serviceId" TEXT REFERENCES "ServiceSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Reservation" ADD COLUMN "serviceId" TEXT REFERENCES "ServiceSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD COLUMN "primaryOfferId" TEXT REFERENCES "ServiceOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD COLUMN "fulfillmentStatus" TEXT NOT NULL DEFAULT 'WAITING';
ALTER TABLE "Reservation" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_RECORDED';
ALTER TABLE "Reservation" ADD COLUMN "paymentObservedAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "paymentObservedById" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "withdrawalOperationKey" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "withdrawnAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "withdrawnById" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "incidentReason" TEXT;

ALTER TABLE "ReservationItem" ADD COLUMN "serviceOfferId" TEXT REFERENCES "ServiceOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Reservation_withdrawalOperationKey_key" ON "Reservation"("withdrawalOperationKey");
CREATE UNIQUE INDEX "ServiceSession_restaurantId_serviceDate_serviceKey_key" ON "ServiceSession"("restaurantId", "serviceDate", "serviceKey");
CREATE INDEX "ServiceSession_restaurantId_serviceDate_idx" ON "ServiceSession"("restaurantId", "serviceDate");
CREATE UNIQUE INDEX "ServiceOffer_serviceId_menuItemId_key" ON "ServiceOffer"("serviceId", "menuItemId");
CREATE INDEX "ServiceOffer_serviceId_available_idx" ON "ServiceOffer"("serviceId", "available");
CREATE UNIQUE INDEX "Reception_operationKey_key" ON "Reception"("operationKey");
CREATE INDEX "Reception_serviceId_createdAt_idx" ON "Reception"("serviceId", "createdAt");
CREATE INDEX "ReceptionLine_offerId_receptionId_idx" ON "ReceptionLine"("offerId", "receptionId");
CREATE INDEX "StockMovement_serviceId_createdAt_idx" ON "StockMovement"("serviceId", "createdAt");
CREATE INDEX "StockMovement_offerId_createdAt_idx" ON "StockMovement"("offerId", "createdAt");
CREATE INDEX "StockMovement_operationKey_idx" ON "StockMovement"("operationKey");
CREATE UNIQUE INDEX "StockAllocation_reservationId_offerId_key" ON "StockAllocation"("reservationId", "offerId");
CREATE INDEX "StockAllocation_serviceId_offerId_idx" ON "StockAllocation"("serviceId", "offerId");
