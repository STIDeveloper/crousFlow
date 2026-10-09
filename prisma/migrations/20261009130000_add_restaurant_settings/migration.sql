CREATE TABLE IF NOT EXISTS "RestaurantSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "socialMealPriceCents" INTEGER NOT NULL DEFAULT 100,
    "nonScholarPriceCents" INTEGER NOT NULL DEFAULT 330,
    "bookingClosingHour" TEXT NOT NULL DEFAULT '11:00',
    "cancellationClosingHour" TEXT NOT NULL DEFAULT '10:30',
    "maxPerDay" INTEGER NOT NULL DEFAULT 1,
    "maxPerWeek" INTEGER NOT NULL DEFAULT 5,
    "maxPeripherals" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RestaurantSetting_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantSetting_restaurantId_key" ON "RestaurantSetting"("restaurantId");
