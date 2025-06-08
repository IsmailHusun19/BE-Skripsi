-- AlterTable
ALTER TABLE `materi` ADD COLUMN `status` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `HubungiKami` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(200) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `noTelp` VARCHAR(50) NOT NULL,
    `pesan` TEXT NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
