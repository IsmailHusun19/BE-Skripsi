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
    PRIMARY KEY (`id`, `nomorinduk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
