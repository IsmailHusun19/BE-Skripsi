/*
  Warnings:

  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(50)`.
  - You are about to drop the `_instructorcourses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_usercourses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `meeting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_instructorcourses` DROP FOREIGN KEY `_InstructorCourses_A_fkey`;

-- DropForeignKey
ALTER TABLE `_instructorcourses` DROP FOREIGN KEY `_InstructorCourses_B_fkey`;

-- DropForeignKey
ALTER TABLE `_usercourses` DROP FOREIGN KEY `_UserCourses_A_fkey`;

-- DropForeignKey
ALTER TABLE `_usercourses` DROP FOREIGN KEY `_UserCourses_B_fkey`;

-- DropForeignKey
ALTER TABLE `meeting` DROP FOREIGN KEY `Meeting_courseId_fkey`;

-- AlterTable
ALTER TABLE `users` MODIFY `role` VARCHAR(50) NOT NULL;

-- DropTable
DROP TABLE `_instructorcourses`;

-- DropTable
DROP TABLE `_usercourses`;

-- DropTable
DROP TABLE `course`;

-- DropTable
DROP TABLE `meeting`;

-- CreateTable
CREATE TABLE `MataKuliah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalAkhir` DATETIME(3) NOT NULL,
    `kodeGabung` VARCHAR(10) NOT NULL,

    UNIQUE INDEX `MataKuliah_kodeGabung_key`(`kodeGabung`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pertemuan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tanggal` DATETIME(3) NOT NULL,
    `mataKuliahId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_MataKuliahDosen` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_MataKuliahDosen_AB_unique`(`A`, `B`),
    INDEX `_MataKuliahDosen_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_MataKuliahMahasiswa` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_MataKuliahMahasiswa_AB_unique`(`A`, `B`),
    INDEX `_MataKuliahMahasiswa_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pertemuan` ADD CONSTRAINT `Pertemuan_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MataKuliahDosen` ADD CONSTRAINT `_MataKuliahDosen_A_fkey` FOREIGN KEY (`A`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MataKuliahDosen` ADD CONSTRAINT `_MataKuliahDosen_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MataKuliahMahasiswa` ADD CONSTRAINT `_MataKuliahMahasiswa_A_fkey` FOREIGN KEY (`A`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MataKuliahMahasiswa` ADD CONSTRAINT `_MataKuliahMahasiswa_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
