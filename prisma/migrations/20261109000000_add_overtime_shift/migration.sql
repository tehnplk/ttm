-- CreateTable: evening overtime shift roster, one row per employee per week
CREATE TABLE `overtime_shift` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` INTEGER NOT NULL,
    `week_start` DATE NOT NULL,
    `shifts` TEXT NOT NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,

    UNIQUE INDEX `overtime_shift_emp_id_week_start_key`(`emp_id`, `week_start`),
    INDEX `overtime_shift_week_start_idx`(`week_start`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
