-- CreateTable
CREATE TABLE `Materi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `tipe` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mataKuliahId` INTEGER NOT NULL,
    `tanggalDibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Materi` ADD CONSTRAINT `Materi_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
