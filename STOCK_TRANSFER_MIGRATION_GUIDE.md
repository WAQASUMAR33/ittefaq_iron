# Stock Transfer Migration Guide

## Issue
The `stock_transfers` and `stock_transfer_details` tables don't exist in the database, causing errors when trying to create stock transfers.

## Solution

### Step 1: Run the Migration SQL

You need to create the tables in your database. You can do this in one of two ways:

#### Option A: Using MySQL Command Line or phpMyAdmin

Run the SQL file: `prisma/migrations/create_stock_transfers.sql`

Or manually execute:

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

#### Option B: Using Prisma Migrate (if you have it set up)

```bash
npx prisma migrate dev --name create_stock_transfers
```

### Step 2: Regenerate Prisma Client

After creating the tables, regenerate the Prisma client:

```bash
# Stop your dev server first (Ctrl+C)
npx prisma generate
# Restart your dev server
npm run dev
```

## After Migration

Once the tables are created and Prisma is regenerated:
- The stock transfer functionality will work properly
- The code will automatically use the Prisma models instead of raw SQL
- You'll no longer see warnings about missing tables or models

## Verification

To verify the tables were created:
1. Check your database - you should see `stock_transfers` and `stock_transfer_details` tables
2. Try creating a stock transfer - it should work without errors
3. Check the console - no more warnings about missing tables






