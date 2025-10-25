-- Manual Migration: Add loader_id and shipping_amount to sales table
-- Run this SQL script directly on your database

-- Add loader_id column to sales table
ALTER TABLE `sales` ADD COLUMN `loader_id` VARCHAR(191) NULL AFTER `credit_account_id`;

-- Add shipping_amount column to sales table
ALTER TABLE `sales` ADD COLUMN `shipping_amount` DECIMAL(65,30) NOT NULL DEFAULT 0 AFTER `loader_id`;

-- Add foreign key constraint for loader_id
ALTER TABLE `sales` ADD CONSTRAINT `sales_loader_id_fkey` 
FOREIGN KEY (`loader_id`) REFERENCES `loaders`(`loader_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Verify the changes
DESCRIBE `sales`;





