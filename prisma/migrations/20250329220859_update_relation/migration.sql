-- DropForeignKey
ALTER TABLE `matakuliahmahasiswa` DROP FOREIGN KEY `MataKuliahMahasiswa_mahasiswaId_fkey`;

-- DropForeignKey
ALTER TABLE `matakuliahmahasiswa` DROP FOREIGN KEY `MataKuliahMahasiswa_mataKuliahId_fkey`;

-- AddForeignKey
ALTER TABLE `MataKuliahMahasiswa` ADD CONSTRAINT `MataKuliahMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MataKuliahMahasiswa` ADD CONSTRAINT `MataKuliahMahasiswa_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
