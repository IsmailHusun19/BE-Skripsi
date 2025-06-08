-- CreateTable
CREATE TABLE `Kuisioner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `dosenId` INTEGER NOT NULL,
    `mataKuliahId` INTEGER NOT NULL,
    `jawabanKuisioner` JSON NOT NULL,
    `saran` LONGTEXT NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Kuisioner` ADD CONSTRAINT `Kuisioner_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kuisioner` ADD CONSTRAINT `Kuisioner_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kuisioner` ADD CONSTRAINT `Kuisioner_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
