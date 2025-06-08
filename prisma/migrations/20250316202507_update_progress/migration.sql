/*
  Warnings:

  - Added the required column `urutan` to the `SubMateri` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mahasiswaprogresssubmateri` ADD COLUMN `lulus` BOOLEAN NULL,
    ADD COLUMN `nilai` INTEGER NULL;

-- AlterTable
ALTER TABLE `submateri` ADD COLUMN `urutan` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `JawabanMahasiswaKuis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `subMateriId` INTEGER NOT NULL,
    `jawabanMahasiswa` JSON NOT NULL,
    `nilai` INTEGER NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `tanggalPengerjaan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statusSelesai` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JawabanMahasiswaKuis` ADD CONSTRAINT `fk_jawaban_mahasiswa` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JawabanMahasiswaKuis` ADD CONSTRAINT `fk_jawaban_submateri` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
