-- CreateTable
CREATE TABLE `employee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prename` VARCHAR(255) NOT NULL,
    `fname` VARCHAR(255) NOT NULL,
    `lname` VARCHAR(255) NOT NULL,
    `sex` VARCHAR(255) NULL,
    `birth` DATE NULL,
    `agey` INTEGER NULL,
    `position` INTEGER NULL,
    `tel` VARCHAR(255) NULL,
    `num_star` INTEGER NULL,
    `emp_id_old` INTEGER NULL,
    `is_active` VARCHAR(255) NULL,
    `created_at` DATETIME NULL,
    `updated_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` INTEGER NOT NULL,
    `branch_id` INTEGER NULL,
    `service_id` INTEGER NULL,
    `price` DECIMAL(10, 2) NULL,
    `book_date` DATE NOT NULL,
    `book_time` VARCHAR(255) NULL,
    `booker_name` VARCHAR(255) NOT NULL,
    `booker_tel` VARCHAR(255) NOT NULL,
    `note1` VARCHAR(255) NULL,
    `note2` VARCHAR(255) NULL,
    `note3` VARCHAR(255) NULL,
    `note4` VARCHAR(255) NOT NULL DEFAULT '',
    `note5` VARCHAR(255) NOT NULL DEFAULT '',
    `booking_id` VARCHAR(50) NULL,
    `cid` VARCHAR(13) NULL,
    `line_id` VARCHAR(255) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'pending',
    `confirm_datetime` DATETIME NULL,
    `created_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cwork_time` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` INTEGER NULL,
    `work_date` DATE NULL,
    `begin_time` TIME NULL,
    `is_active` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cclose` (
    `cdate` DATE NOT NULL,
    `note` VARCHAR(255) NULL,

    PRIMARY KEY (`cdate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `choliday` (
    `hdate` DATE NOT NULL,
    `note` VARCHAR(255) NULL,

    PRIMARY KEY (`hdate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cposition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `position` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cstop` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` INTEGER NOT NULL,
    `stop_date` DATE NOT NULL,
    `stop_time` VARCHAR(5) NOT NULL,
    `note1` VARCHAR(255) NULL,
    `note2` VARCHAR(255) NULL,
    `note3` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emp_stop_date` (
    `emp_id` INTEGER NOT NULL,
    `stop_date` DATE NOT NULL,

    PRIMARY KEY (`emp_id`, `stop_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `line_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `line_id` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `created_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `view_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ip_address` VARCHAR(255) NULL,
    `viewed_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_delete_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `customer_phone` VARCHAR(255) NOT NULL,
    `book_date` DATE NOT NULL,
    `book_time` VARCHAR(255) NULL,
    `staff_id` INTEGER NULL,
    `staff_name` VARCHAR(500) NULL,
    `branch_id` INTEGER NULL,
    `branch_name` VARCHAR(255) NULL,
    `service_id` INTEGER NULL,
    `service_name` VARCHAR(255) NULL,
    `deleted_by` VARCHAR(255) NOT NULL,
    `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_delete_log_deleted_at_idx`(`deleted_at`),
    INDEX `booking_delete_log_deleted_by_idx`(`deleted_by`),
    INDEX `booking_delete_log_booking_id_idx`(`booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `location` VARCHAR(500) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `image` VARCHAR(500) NOT NULL DEFAULT '/placeholder-branch.png',
    `availableServices` TEXT NOT NULL DEFAULT '[]',
    `is_active` VARCHAR(255) NULL DEFAULT 'yes',
    `createdAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME NULL,

    UNIQUE INDEX `Branch_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `duration` INTEGER NOT NULL DEFAULT 60,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `image` VARCHAR(500) NOT NULL DEFAULT '/placeholder-service.png',
    `enabled` VARCHAR(255) NOT NULL DEFAULT 'yes',
    `createdAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` VARCHAR(255) NOT NULL,
    `offDays` TEXT NOT NULL DEFAULT '[]',
    `busySlots` TEXT NOT NULL DEFAULT '{}',
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME NULL,

    UNIQUE INDEX `StaffSchedule_staff_id_key`(`staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staffholiday` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` VARCHAR(255) NOT NULL,
    `branch_id` INTEGER NULL,
    `holiday_date` DATE NOT NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShopConfig` (
    `id` VARCHAR(191) NOT NULL,
    `openTime` INTEGER NOT NULL,
    `closeTime` INTEGER NOT NULL,
    `holidays` TEXT NOT NULL DEFAULT '[]',
    `slotInterval` INTEGER NOT NULL,
    `booking_enabled` VARCHAR(255) NOT NULL DEFAULT 'yes',
    `booking_message` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opening_hours` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` VARCHAR(255) NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enabled` VARCHAR(255) NOT NULL DEFAULT 'yes',
    `notification_time` VARCHAR(5) NOT NULL DEFAULT '09:00',
    `message_template` TEXT NULL,
    `days_before` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_id` VARCHAR(255) NOT NULL,
    `provider_type` VARCHAR(50) NOT NULL DEFAULT 'provider-id',
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `hash_cid` VARCHAR(255) NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'staff',
    `is_active` VARCHAR(255) NOT NULL DEFAULT 'yes',
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `profile_data` TEXT NULL,
    `last_login` DATETIME NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME NULL,

    UNIQUE INDEX `admin_users_provider_id_key`(`provider_id`),
    INDEX `admin_users_provider_id_idx`(`provider_id`),
    INDEX `admin_users_provider_type_idx`(`provider_type`),
    INDEX `admin_users_is_active_idx`(`is_active`),
    INDEX `admin_users_status_idx`(`status`),
    INDEX `admin_users_hash_cid_idx`(`hash_cid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` VARCHAR(10) NOT NULL DEFAULT 'yes',
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_emp_id_fkey` FOREIGN KEY (`emp_id`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

