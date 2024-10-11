/*
  Warnings:

  - You are about to drop the column `instructorId` on the `course` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `course` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(191)`.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[joinCode]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `joinCode` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `course` DROP FOREIGN KEY `Course_instructorId_fkey`;

-- AlterTable
ALTER TABLE `course` DROP COLUMN `instructorId`,
    ADD COLUMN `joinCode` VARCHAR(10) NOT NULL,
    MODIFY `name` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomorinduk` VARCHAR(200) NOT NULL,
    `nama` VARCHAR(200) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `password` VARCHAR(200) NOT NULL,
    `role` VARCHAR(200) NOT NULL,

    UNIQUE INDEX `users_nomorinduk_key`(`nomorinduk`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_InstructorCourses` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_InstructorCourses_AB_unique`(`A`, `B`),
    INDEX `_InstructorCourses_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_UserCourses` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_UserCourses_AB_unique`(`A`, `B`),
    INDEX `_UserCourses_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Course_joinCode_key` ON `Course`(`joinCode`);

-- AddForeignKey
ALTER TABLE `_InstructorCourses` ADD CONSTRAINT `_InstructorCourses_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_InstructorCourses` ADD CONSTRAINT `_InstructorCourses_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserCourses` ADD CONSTRAINT `_UserCourses_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserCourses` ADD CONSTRAINT `_UserCourses_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
