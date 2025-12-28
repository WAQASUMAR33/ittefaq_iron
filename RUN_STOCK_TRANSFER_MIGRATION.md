# Run Stock Transfer Migration

## Quick Fix

The `stock_transfers` table doesn't exist in your database. You need to run the migration SQL.

### Step 1: Run the SQL Migration

**Option A: Using phpMyAdmin or MySQL Workbench**
1. Open phpMyAdmin or MySQL Workbench
2. Select your database: `u889453186_parianwali`
3. Go to SQL tab
4. Copy and paste the contents of `prisma/migrations/create_stock_transfers.sql`
5. Click "Go" or "Execute"

**Option B: Using MySQL Command Line**
```bash
mysql -u your_username -p u889453186_parianwali < prisma/migrations/create_stock_transfers.sql
```

**Option C: Copy and paste this SQL directly:**

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

### Step 2: Verify Tables Were Created

After running the SQL, verify the tables exist:
```sql
SHOW TABLES LIKE 'stock_transfer%';
```

You should see:
- `stock_transfers`
- `stock_transfer_details`

### Step 3: Test Stock Transfer

After creating the tables, try creating a stock transfer again. It should work now!

## Notes

- The `IF NOT EXISTS` clause ensures the tables won't be created again if they already exist
- All foreign key relationships are properly set up
- The tables will be ready to use immediately after creation






