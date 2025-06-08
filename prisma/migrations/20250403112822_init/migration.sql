/*
  Warnings:

  - A unique constraint covering the columns `[mahasiswaId,subMateriId]` on the table `MahasiswaProgressSubMateri` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `MahasiswaProgressSubMateri_mahasiswaId_subMateriId_key` ON `MahasiswaProgressSubMateri`(`mahasiswaId`, `subMateriId`);
