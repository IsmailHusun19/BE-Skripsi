-- DropForeignKey
ALTER TABLE `jawabanmahasiswakuis` DROP FOREIGN KEY `fk_jawaban_mahasiswa`;

-- DropForeignKey
ALTER TABLE `jawabanmahasiswakuis` DROP FOREIGN KEY `fk_jawaban_submateri`;

-- DropForeignKey
ALTER TABLE `mahasiswaprogresssubmateri` DROP FOREIGN KEY `MahasiswaProgressSubMateri_mahasiswaId_fkey`;

-- DropForeignKey
ALTER TABLE `mahasiswaprogresssubmateri` DROP FOREIGN KEY `MahasiswaProgressSubMateri_subMateriId_fkey`;

-- AddForeignKey
ALTER TABLE `JawabanMahasiswaKuis` ADD CONSTRAINT `fk_jawaban_mahasiswa` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JawabanMahasiswaKuis` ADD CONSTRAINT `fk_jawaban_submateri` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MahasiswaProgressSubMateri` ADD CONSTRAINT `MahasiswaProgressSubMateri_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MahasiswaProgressSubMateri` ADD CONSTRAINT `MahasiswaProgressSubMateri_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
