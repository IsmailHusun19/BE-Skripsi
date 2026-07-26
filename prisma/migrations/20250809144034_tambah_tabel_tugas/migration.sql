-- CreateTable
CREATE TABLE `Tugas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(200) NOT NULL,
    `deskripsi` LONGTEXT NOT NULL,
    `mataKuliahId` INTEGER NOT NULL,
    `dosenId` INTEGER NOT NULL,
    `tanggalDibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deadline` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengumpulanTugas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tugasId` INTEGER NOT NULL,
    `mahasiswaId` INTEGER NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `tanggalKumpul` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nilai` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tugas` ADD CONSTRAINT `fk_tugas_mata_kuliah` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tugas` ADD CONSTRAINT `Tugas_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengumpulanTugas` ADD CONSTRAINT `PengumpulanTugas_tugasId_fkey` FOREIGN KEY (`tugasId`) REFERENCES `Tugas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengumpulanTugas` ADD CONSTRAINT `PengumpulanTugas_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
