/*
  Warnings:

  - You are about to drop the column `jawabanBenar` on the `submateri` table. All the data in the column will be lost.
  - You are about to drop the column `pertanyaan` on the `submateri` table. All the data in the column will be lost.
  - You are about to drop the column `pilihan` on the `submateri` table. All the data in the column will be lost.
  - Made the column `subMateriId` on table `gambarmateri` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `gambarmateri` DROP FOREIGN KEY `GambarMateri_subMateriId_fkey`;

-- AlterTable
ALTER TABLE `filemateri` ADD COLUMN `subKuisId` INTEGER NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'materi',
    MODIFY `subMateriId` INTEGER NULL;

-- AlterTable
ALTER TABLE `gambarmateri` MODIFY `subMateriId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `submateri` DROP COLUMN `jawabanBenar`,
    DROP COLUMN `pertanyaan`,
    DROP COLUMN `pilihan`,
    MODIFY `type` VARCHAR(191) NOT NULL DEFAULT 'materi';

-- CreateTable
CREATE TABLE `SubKuis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subMateriId` INTEGER NOT NULL,
    `pertanyaan` JSON NULL,
    `pilihan` JSON NOT NULL,
    `jawabanBenar` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubKuis` ADD CONSTRAINT `SubKuis_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileMateri` ADD CONSTRAINT `FileMateri_subKuisId_fkey` FOREIGN KEY (`subKuisId`) REFERENCES `SubKuis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GambarMateri` ADD CONSTRAINT `GambarMateri_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
