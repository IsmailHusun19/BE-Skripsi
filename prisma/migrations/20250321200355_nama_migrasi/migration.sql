/*
  Warnings:

  - Added the required column `nilai` to the `jawabanmahasiswakuis` table without a default value. This is not possible if the table is not empty.
  - Made the column `nilaiPertamaLulus` on table `jawabanmahasiswakuis` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `jawabanmahasiswakuis` DROP COLUMN `nilai`,
    ADD COLUMN `nilai` JSON NOT NULL,
    MODIFY `nilaiPertamaLulus` INTEGER NOT NULL DEFAULT -1;
