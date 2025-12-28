# ⚠️ URGENT: Run This SQL to Create Stock Transfer Tables

## The Problem
The `stock_transfers` and `stock_transfer_details` tables don't exist in your database.

## The Solution: Run This SQL NOW

### Step-by-Step Instructions:

1. **Open phpMyAdmin** (or your MySQL client)
2. **Select your database**: `u889453186_parianwali`
3. **Click "SQL" tab**
4. **Copy ALL the SQL below**
5. **Paste it into the SQL text box**
6. **Click "Go" or "Execute"**

---

## SQL to Run:

```sql
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

---

## After Running SQL:

1. **Verify tables exist**:
   ```sql
   SHOW TABLES LIKE 'stock_transfer%';
   ```
   You should see both tables listed.

2. **Refresh your application** - the stock transfer page should work now!

3. **Try creating a stock transfer** - it should work without errors.

---

## If You Get Errors:

- **Foreign key errors**: Make sure `stores`, `products`, and `users` tables exist
- **Permission errors**: Make sure you have CREATE TABLE permissions
- **Syntax errors**: Make sure you copied the entire SQL (both CREATE TABLE statements)

---

## File Location:
The SQL file is also saved at: `CREATE_STOCK_TRANSFER_TABLES.sql`






