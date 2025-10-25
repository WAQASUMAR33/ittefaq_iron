-- CreateTable: sale_returns
CREATE TABLE IF NOT EXISTS `sale_returns` (
    `return_id` VARCHAR(191) NOT NULL,
    `sale_id` VARCHAR(191) NOT NULL,
    `cus_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `payment` DECIMAL(65, 30) NOT NULL,
    `payment_type` ENUM('CASH', 'CHEQUE', 'BANK_TRANSFER') NOT NULL,
    `debit_account_id` VARCHAR(191) NULL,
    `credit_account_id` VARCHAR(191) NULL,
    `loader_id` VARCHAR(191) NULL,
    `shipping_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `reason` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`return_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: sale_return_details
CREATE TABLE IF NOT EXISTS `sale_return_details` (
    `return_detail_id` VARCHAR(191) NOT NULL,
    `return_id` VARCHAR(191) NOT NULL,
    `pro_id` VARCHAR(191) NOT NULL,
    `qnty` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unit_rate` DECIMAL(65, 30) NOT NULL,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `net_total` DECIMAL(65, 30) NOT NULL,
    `cus_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    PRIMARY KEY (`return_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_debit_account_id_fkey` FOREIGN KEY (`debit_account_id`) REFERENCES `customers`(`cus_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_credit_account_id_fkey` FOREIGN KEY (`credit_account_id`) REFERENCES `customers`(`cus_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_loader_id_fkey` FOREIGN KEY (`loader_id`) REFERENCES `loaders`(`loader_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sale_return_details` ADD CONSTRAINT `sale_return_details_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `sale_returns`(`return_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sale_return_details` ADD CONSTRAINT `sale_return_details_pro_id_fkey` FOREIGN KEY (`pro_id`) REFERENCES `products`(`pro_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sale_return_details` ADD CONSTRAINT `sale_return_details_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sale_return_details` ADD CONSTRAINT `sale_return_details_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;


