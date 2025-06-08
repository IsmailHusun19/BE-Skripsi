-- AlterTable
ALTER TABLE `jawabanmahasiswakuis` ADD COLUMN `isOngoing` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `nilaiPertamaLulus` INTEGER NULL,
    MODIFY `attempts` INTEGER NOT NULL DEFAULT 0;
