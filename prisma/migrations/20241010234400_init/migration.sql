-- CreateEnum
CREATE TYPE `UserRole` AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALESMAN');

-- CreateEnum
CREATE TYPE `UserStatus` AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE `CustomerType` AS ENUM ('RETAIL', 'WHOLESALE', 'CORPORATE');

-- CreateEnum
CREATE TYPE `TransactionType` AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE `PaymentType` AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE `BillType` AS ENUM ('QUOTATION', 'ORDER', 'BILL');

-- CreateTable
CREATE TABLE `users` (
    `user_id` VARCHAR(191) NOT NULL,
    `role` `UserRole` NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `status` `UserStatus` NOT NULL DEFAULT 'ACTIVE',
    `last_logged_in` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_categories` (
    `cus_cat_id` VARCHAR(191) NOT NULL,
    `cus_cat_title` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cus_cat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `cus_id` VARCHAR(191) NOT NULL,
    `cus_category` VARCHAR(191) NOT NULL,
    `cus_type` `CustomerType` NOT NULL,
    `cus_name` VARCHAR(191) NOT NULL,
    `cus_phone_no` VARCHAR(191) NOT NULL,
    `cus_phone_no2` VARCHAR(191) NULL,
    `cus_address` VARCHAR(191) NOT NULL,
    `cus_reference` VARCHAR(191) NULL,
    `cus_account_info` VARCHAR(191) NULL,
    `other` VARCHAR(191) NULL,
    `cus_balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cus_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `cat_id` VARCHAR(191) NOT NULL,
    `cat_name` VARCHAR(191) NOT NULL,
    `cat_code` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_cat_code_key`(`cat_code`),
    PRIMARY KEY (`cat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_categories` (
    `sub_cat_id` VARCHAR(191) NOT NULL,
    `cat_id` VARCHAR(191) NOT NULL,
    `sub_cat_name` VARCHAR(191) NOT NULL,
    `sub_cat_code` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sub_categories_sub_cat_code_key`(`sub_cat_code`),
    PRIMARY KEY (`sub_cat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `pro_id` VARCHAR(191) NOT NULL,
    `cat_id` VARCHAR(191) NOT NULL,
    `sub_cat_id` VARCHAR(191) NOT NULL,
    `pro_title` VARCHAR(191) NOT NULL,
    `pro_description` VARCHAR(191) NOT NULL,
    `pro_cost_price` DECIMAL(65, 30) NOT NULL,
    `pro_sale_price` DECIMAL(65, 30) NOT NULL,
    `pro_baser_price` DECIMAL(65, 30) NOT NULL,
    `pro_stock_qnty` INTEGER NOT NULL DEFAULT 0,
    `pro_unit` VARCHAR(191) NOT NULL,
    `pro_packing` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`pro_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger` (
    `l_id` VARCHAR(191) NOT NULL,
    `cus_id` VARCHAR(191) NOT NULL,
    `opening_balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `debit_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `credit_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `closing_balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `bill_no` VARCHAR(191) NULL,
    `trnx_type` `TransactionType` NOT NULL,
    `details` VARCHAR(191) NULL,
    `payments` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `updated_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`l_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_titles` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expense_titles_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `exp_id` VARCHAR(191) NOT NULL,
    `exp_title` VARCHAR(191) NOT NULL,
    `exp_type` VARCHAR(191) NOT NULL,
    `exp_detail` VARCHAR(191) NULL,
    `exp_amount` DECIMAL(65, 30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`exp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `sale_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `cus_id` VARCHAR(191) NOT NULL,
    `payment` DECIMAL(65, 30) NOT NULL,
    `payment_type` `PaymentType` NOT NULL,
    `bill_type` `BillType` NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_details` (
    `sale_detail_id` VARCHAR(191) NOT NULL,
    `sale_id` VARCHAR(191) NOT NULL,
    `pro_id` VARCHAR(191) NOT NULL,
    `vehicle_no` VARCHAR(191) NULL,
    `qnty` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unit_rate` DECIMAL(65, 30) NOT NULL,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `net_total` DECIMAL(65, 30) NOT NULL,
    `cus_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`sale_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `pur_id` VARCHAR(191) NOT NULL,
    `cus_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `net_total` DECIMAL(65, 30) NOT NULL,
    `payment` DECIMAL(65, 30) NOT NULL,
    `payment_type` `PaymentType` NOT NULL,
    `vehicle_no` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`pur_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_details` (
    `pur_detail_id` VARCHAR(191) NOT NULL,
    `pur_id` VARCHAR(191) NOT NULL,
    `vehicle_no` VARCHAR(191) NULL,
    `cus_id` VARCHAR(191) NOT NULL,
    `pro_id` VARCHAR(191) NOT NULL,
    `qnty` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unit_rate` DECIMAL(65, 30) NOT NULL,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `net_total` DECIMAL(65, 30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`pur_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cargo` (
    `cargo_id` VARCHAR(191) NOT NULL,
    `vehicle_no` VARCHAR(191) NOT NULL,
    `total_cargo_fare` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `exp1` DECIMAL(65, 30) NULL DEFAULT 0,
    `exp2` DECIMAL(65, 30) NULL DEFAULT 0,
    `exp3` DECIMAL(65, 30) NULL DEFAULT 0,
    `exp4` DECIMAL(65, 30) NULL DEFAULT 0,
    `exp5` DECIMAL(65, 30) NULL DEFAULT 0,
    `exp6` DECIMAL(65, 30) NULL DEFAULT 0,
    `others` DECIMAL(65, 30) NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`cargo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_cus_category_fkey` FOREIGN KEY (`cus_category`) REFERENCES `customer_categories`(`cus_cat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_categories` ADD CONSTRAINT `sub_categories_cat_id_fkey` FOREIGN KEY (`cat_id`) REFERENCES `categories`(`cat_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_cat_id_fkey` FOREIGN KEY (`cat_id`) REFERENCES `categories`(`cat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_sub_cat_id_fkey` FOREIGN KEY (`sub_cat_id`) REFERENCES `sub_categories`(`sub_cat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `ledger_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `ledger_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_exp_type_fkey` FOREIGN KEY (`exp_type`) REFERENCES `expense_titles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_pro_id_fkey` FOREIGN KEY (`pro_id`) REFERENCES `products`(`pro_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_details` ADD CONSTRAINT `purchase_details_pur_id_fkey` FOREIGN KEY (`pur_id`) REFERENCES `purchases`(`pur_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_details` ADD CONSTRAINT `purchase_details_cus_id_fkey` FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_details` ADD CONSTRAINT `purchase_details_pro_id_fkey` FOREIGN KEY (`pro_id`) REFERENCES `products`(`pro_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_details` ADD CONSTRAINT `purchase_details_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargo` ADD CONSTRAINT `cargo_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
