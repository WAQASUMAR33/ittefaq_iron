-- Migration to add Hold Bills functionality
-- This script adds the necessary tables for hold bills

-- Add HoldBillStatus enum
ALTER TABLE `hold_bills` ADD COLUMN IF NOT EXISTS `status` ENUM('DRAFT', 'PENDING', 'CONVERTED', 'CANCELLED') DEFAULT 'DRAFT';

-- Create hold_bills table
CREATE TABLE IF NOT EXISTS `hold_bills` (
  `hold_bill_id` INT AUTO_INCREMENT PRIMARY KEY,
  `cus_id` INT NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0,
  `payment` DECIMAL(10,2) DEFAULT 0,
  `payment_type` ENUM('CASH', 'CHEQUE', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `debit_account_id` INT NULL,
  `credit_account_id` INT NULL,
  `loader_id` INT NULL,
  `shipping_amount` DECIMAL(10,2) DEFAULT 0,
  `bill_type` ENUM('QUOTATION', 'ORDER', 'BILL') NOT NULL DEFAULT 'BILL',
  `status` ENUM('DRAFT', 'PENDING', 'CONVERTED', 'CANCELLED') DEFAULT 'DRAFT',
  `reference` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `updated_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE CASCADE,
  FOREIGN KEY (`debit_account_id`) REFERENCES `customers`(`cus_id`) ON DELETE SET NULL,
  FOREIGN KEY (`credit_account_id`) REFERENCES `customers`(`cus_id`) ON DELETE SET NULL,
  FOREIGN KEY (`loader_id`) REFERENCES `loaders`(`loader_id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hold_bill_details table
CREATE TABLE IF NOT EXISTS `hold_bill_details` (
  `hold_bill_detail_id` INT AUTO_INCREMENT PRIMARY KEY,
  `hold_bill_id` INT NOT NULL,
  `pro_id` INT NOT NULL,
  `vehicle_no` VARCHAR(255) NULL,
  `qnty` INT NOT NULL,
  `unit` VARCHAR(100) NOT NULL,
  `unit_rate` DECIMAL(10,2) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0,
  `net_total` DECIMAL(10,2) NOT NULL,
  `cus_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT NULL,
  
  FOREIGN KEY (`hold_bill_id`) REFERENCES `hold_bills`(`hold_bill_id`) ON DELETE CASCADE,
  FOREIGN KEY (`pro_id`) REFERENCES `products`(`pro_id`) ON DELETE CASCADE,
  FOREIGN KEY (`cus_id`) REFERENCES `customers`(`cus_id`) ON DELETE CASCADE,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS `idx_hold_bills_cus_id` ON `hold_bills`(`cus_id`);
CREATE INDEX IF NOT EXISTS `idx_hold_bills_status` ON `hold_bills`(`status`);
CREATE INDEX IF NOT EXISTS `idx_hold_bills_created_at` ON `hold_bills`(`created_at`);
CREATE INDEX IF NOT EXISTS `idx_hold_bill_details_hold_bill_id` ON `hold_bill_details`(`hold_bill_id`);
CREATE INDEX IF NOT EXISTS `idx_hold_bill_details_pro_id` ON `hold_bill_details`(`pro_id`);

