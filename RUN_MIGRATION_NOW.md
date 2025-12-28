# ⚠️ URGENT: Run Stock Transfer Migration

## The Error
Your database is missing the `stock_transfers` and `stock_transfer_details` tables.

## Solution: Run This SQL NOW

### Method 1: phpMyAdmin (Easiest)
1. Open phpMyAdmin
2. Select database: `u889453186_parianwali`
3. Click "SQL" tab
4. Copy and paste ALL the SQL below
5. Click "Go"

### Method 2: MySQL Command Line
```bash
mysql -u your_username -p u889453186_parianwali < prisma/migrations/create_stock_transfers.sql
```

---

## Copy This SQL and Run It:

```sql
-- Create stock_transfers table
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `transfer_id` INT NOT NULL AUTO_INCREMENT,
  `transfer_no` VARCHAR(255) NULL,
  `transfer_date` DATE NOT NULL,
  `from_store_id` INT NOT NULL,
  `to_store_id` INT NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updated_by` INT NULL,
  PRIMARY KEY (`transfer_id`),
  UNIQUE INDEX `stock_transfers_transfer_no_key` (`transfer_no`),
  INDEX `stock_transfers_from_store_id_fkey` (`from_store_id`),
  INDEX `stock_transfers_to_store_id_fkey` (`to_store_id`),
  INDEX `stock_transfers_updated_by_fkey` (`updated_by`),
  CONSTRAINT `stock_transfers_from_store_id_fkey` FOREIGN KEY (`from_store_id`) REFERENCES `stores` (`storeid`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_transfers_to_store_id_fkey` FOREIGN KEY (`to_store_id`) REFERENCES `stores` (`storeid`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_transfers_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_transfer_details table
CREATE TABLE IF NOT EXISTS `stock_transfer_details` (
  `transfer_detail_id` INT NOT NULL AUTO_INCREMENT,
  `transfer_id` INT NOT NULL,
  `pro_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `packing` INT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`transfer_detail_id`),
  INDEX `stock_transfer_details_transfer_id_fkey` (`transfer_id`),
  INDEX `stock_transfer_details_pro_id_fkey` (`pro_id`),
  CONSTRAINT `stock_transfer_details_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`transfer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_transfer_details_pro_id_fkey` FOREIGN KEY (`pro_id`) REFERENCES `products` (`pro_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## After Running the SQL:

1. ✅ Verify tables were created:
   ```sql
   SHOW TABLES LIKE 'stock_transfer%';
   ```
   You should see both tables.

2. ✅ Try creating a stock transfer again - it should work!

## Still Having Issues?

If you get foreign key errors, make sure:
- The `stores` table exists
- The `products` table exists  
- The `users` table exists

All referenced tables must exist before creating foreign keys.






