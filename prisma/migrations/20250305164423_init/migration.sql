-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomorinduk` VARCHAR(200) NOT NULL,
    `nama` VARCHAR(200) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `password` VARCHAR(200) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `tanggalDaftar` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_nomorinduk_key`(`nomorinduk`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MataKuliah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `kodeGabung` VARCHAR(100) NOT NULL,
    `tanggalDibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MataKuliah_kodeGabung_key`(`kodeGabung`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MataKuliahMahasiswa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `mataKuliahId` INTEGER NOT NULL,
    `tanggalGabung` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Materi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `mataKuliahId` INTEGER NOT NULL,
    `tanggalDibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubMateri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isi` LONGTEXT NULL,
    `materiId` INTEGER NOT NULL,
    `tanggalDibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pertanyaan` JSON NULL,
    `pilihan` JSON NOT NULL,
    `jawabanBenar` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileMateri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `subMateriId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GambarMateri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `subMateriId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MahasiswaProgressSubMateri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `subMateriId` INTEGER NOT NULL,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `tanggalAkses` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_MataKuliahDosen` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_MataKuliahDosen_AB_unique`(`A`, `B`),
    INDEX `_MataKuliahDosen_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MataKuliahMahasiswa` ADD CONSTRAINT `MataKuliahMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MataKuliahMahasiswa` ADD CONSTRAINT `MataKuliahMahasiswa_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Materi` ADD CONSTRAINT `Materi_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubMateri` ADD CONSTRAINT `SubMateri_materiId_fkey` FOREIGN KEY (`materiId`) REFERENCES `Materi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileMateri` ADD CONSTRAINT `FileMateri_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GambarMateri` ADD CONSTRAINT `GambarMateri_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MahasiswaProgressSubMateri` ADD CONSTRAINT `MahasiswaProgressSubMateri_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MahasiswaProgressSubMateri` ADD CONSTRAINT `MahasiswaProgressSubMateri_subMateriId_fkey` FOREIGN KEY (`subMateriId`) REFERENCES `SubMateri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MataKuliahDosen` ADD CONSTRAINT `_MataKuliahDosen_A_fkey` FOREIGN KEY (`A`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MataKuliahDosen` ADD CONSTRAINT `_MataKuliahDosen_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
