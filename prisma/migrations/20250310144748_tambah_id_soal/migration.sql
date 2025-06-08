/*
  Warnings:

  - Added the required column `idSoal` to the `FileMateri` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `filemateri` ADD COLUMN `idSoal` JSON NOT NULL;
