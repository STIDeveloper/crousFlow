-- Extension additive : les lignes existantes restent des plats principaux.
ALTER TABLE "Meal" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'MAIN';
ALTER TABLE "Meal" ADD COLUMN "socialEligible" BOOLEAN NOT NULL DEFAULT false;

-- Avant cette migration, chaque produit publié dans MenuItem était présenté comme un plat réservable.
UPDATE "Meal"
SET "socialEligible" = true
WHERE "id" IN (SELECT DISTINCT "mealId" FROM "MenuItem");

ALTER TABLE "Reservation" ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Reservation" ADD COLUMN "socialQuotaKey" TEXT;

CREATE UNIQUE INDEX "Reservation_socialQuotaKey_key" ON "Reservation"("socialQuotaKey");

CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReservationItem_reservationId_menuItemId_key" ON "ReservationItem"("reservationId", "menuItemId");
CREATE INDEX "ReservationItem_menuItemId_idx" ON "ReservationItem"("menuItemId");
