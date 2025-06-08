/*
  Warnings:

  - You are about to drop the column `lulus` on the `mahasiswaprogresssubmateri` table. All the data in the column will be lost.
  - You are about to drop the column `nilai` on the `mahasiswaprogresssubmateri` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `mahasiswaprogresssubmateri` DROP COLUMN `lulus`,
    DROP COLUMN `nilai`;
