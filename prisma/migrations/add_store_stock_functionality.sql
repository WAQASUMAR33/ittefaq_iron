-- Migration: Add Store Stock Functionality
-- This migration adds multi-store stock tracking capability

-- Create store_stocks table
CREATE TABLE IF NOT EXISTS `store_stocks` (
  `store_stock_id` INT NOT NULL AUTO_INCREMENT,
  `store_id` INT NOT NULL,
  `pro_id` INT NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `min_stock` INT NOT NULL DEFAULT 0,
  `max_stock` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `updated_by` INT NULL,
  PRIMARY KEY (`store_stock_id`),
  UNIQUE INDEX `store_stocks_store_id_pro_id_key` (`store_id`, `pro_id`),
  INDEX `store_stocks_store_id_fkey` (`store_id`),
  INDEX `store_stocks_pro_id_fkey` (`pro_id`),
  INDEX `store_stocks_updated_by_fkey` (`updated_by`),
  CONSTRAINT `store_stocks_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores` (`storeid`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `store_stocks_pro_id_fkey` FOREIGN KEY (`pro_id`) REFERENCES `products` (`pro_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `store_stocks_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Initialize store stocks for existing products and stores
-- This will create store stock entries for all existing products in all stores
INSERT INTO `store_stocks` (`store_id`, `pro_id`, `stock_quantity`, `min_stock`, `max_stock`, `created_at`, `updated_at`)
SELECT 
  s.storeid as store_id,
  p.pro_id,
  p.pro_stock_qnty as stock_quantity,
  0 as min_stock,
  1000 as max_stock,
  NOW() as created_at,
  NOW() as updated_at
FROM `stores` s
CROSS JOIN `products` p
WHERE NOT EXISTS (
  SELECT 1 FROM `store_stocks` ss 
  WHERE ss.store_id = s.storeid AND ss.pro_id = p.pro_id
);

-- Add store_id to sales table if it doesn't exist
ALTER TABLE `sales` 
ADD COLUMN IF NOT EXISTS `store_id` INT NULL,
ADD INDEX IF NOT EXISTS `sales_store_id_fkey` (`store_id`),
ADD CONSTRAINT IF NOT EXISTS `sales_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores` (`storeid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add store_id to sale_details table if it doesn't exist
ALTER TABLE `sale_details` 
ADD COLUMN IF NOT EXISTS `store_id` INT NULL,
ADD INDEX IF NOT EXISTS `sale_details_store_id_fkey` (`store_id`),
ADD CONSTRAINT IF NOT EXISTS `sale_details_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores` (`storeid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add store_id to purchase_details table if it doesn't exist
ALTER TABLE `purchase_details` 
ADD COLUMN IF NOT EXISTS `store_id` INT NULL,
ADD INDEX IF NOT EXISTS `purchase_details_store_id_fkey` (`store_id`),
ADD CONSTRAINT IF NOT EXISTS `purchase_details_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores` (`storeid`) ON DELETE SET NULL ON UPDATE CASCADE;








