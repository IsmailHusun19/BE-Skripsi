-- CreateTable
CREATE TABLE `SubMateri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `tipe` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `materiId` INTEGER NOT NULL,
    `tanggalDibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubMateri` ADD CONSTRAINT `SubMateri_materiId_fkey` FOREIGN KEY (`materiId`) REFERENCES `Materi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
