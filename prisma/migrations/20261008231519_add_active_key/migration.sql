/*
  Warnings:

  - A unique constraint covering the columns `[activeKey]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "activeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_activeKey_key" ON "Reservation"("activeKey");
