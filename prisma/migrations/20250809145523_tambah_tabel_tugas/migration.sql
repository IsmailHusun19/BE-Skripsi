-- CreateTable
CREATE TABLE `FileTugas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tugasId` INTEGER NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileType` VARCHAR(50) NULL,
    `fileSize` INTEGER NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FileTugas` ADD CONSTRAINT `FileTugas_tugasId_fkey` FOREIGN KEY (`tugasId`) REFERENCES `Tugas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
