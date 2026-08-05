-- CreateTable
CREATE TABLE `broadcast_send_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image_path` VARCHAR(500) NOT NULL,
    `branch_ids` TEXT NOT NULL,
    `total_count` INTEGER NOT NULL DEFAULT 0,
    `sent_count` INTEGER NOT NULL DEFAULT 0,
    `failed_count` INTEGER NOT NULL DEFAULT 0,
    `sent_at` DATETIME NOT NULL,

    INDEX `broadcast_send_log_sent_at_idx`(`sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `broadcast_send_recipient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `log_id` INTEGER NOT NULL,
    `line_id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NULL,
    `phone` VARCHAR(255) NULL,
    `success` VARCHAR(10) NOT NULL DEFAULT 'yes',
    `sent_at` DATETIME NOT NULL,

    INDEX `broadcast_send_recipient_log_id_idx`(`log_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `broadcast_send_recipient` ADD CONSTRAINT `broadcast_send_recipient_log_id_fkey` FOREIGN KEY (`log_id`) REFERENCES `broadcast_send_log`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

