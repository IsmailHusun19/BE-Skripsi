/*
  Warnings:

  - You are about to drop the column `subKuisId` on the `filemateri` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `filemateri` table. All the data in the column will be lost.
  - You are about to drop the `subkuis` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `subMateriId` on table `filemateri` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `pilihan` to the `SubMateri` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `filemateri` DROP FOREIGN KEY `FileMateri_subKuisId_fkey`;

-- DropForeignKey
ALTER TABLE `filemateri` DROP FOREIGN KEY `FileMateri_subMateriId_fkey`;

-- DropForeignKey
ALTER TABLE `subkuis` DROP FOREIGN KEY `SubKuis_subMateriId_fkey`;

-- AlterTable
ALTER TABLE `filemateri` DROP COLUMN `subKuisId`,
    DROP COLUMN `type`,
    MODIFY `subMateriId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `gambarmateri` MODIFY `subMateriId` INTEGER NULL;

-- AlterTable
ALTER TABLE `submateri` ADD COLUMN `jawabanBenar` JSON NULL,
    ADD COLUMN `pertanyaan` JSON NULL,
    ADD COLUMN `pilihan` JSON NOT NULL,
    ALTER COLUMN `type` DROP DEFAULT;

-- DropTable
DROP TABLE `subkuis`;

-- AddForeignKey
ALTER TABLE `FileMateri` ADD CONSTRAINT `FileMateri_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
