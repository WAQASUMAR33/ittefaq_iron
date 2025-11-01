# Run Sales Migration to Add store_id Column

## Issue
The database table `sales` is missing the `store_id` column, causing this error:
```
The column `store_id` does not exist in the current database.
```

## Solution

### Option 1: Simple SQL (Recommended)
Run the `ADD_STORE_ID_TO_SALES_SIMPLE.sql` file in your database:

1. **Using phpMyAdmin or MySQL Workbench:**
   - Open phpMyAdmin/MySQL Workbench
   - Select your database
   - Click on "SQL" tab
   - Copy and paste the contents of `ADD_STORE_ID_TO_SALES_SIMPLE.sql`
   - Click "Go" or "Execute"

2. **Using Command Line:**
   ```bash
   mysql -u your_username -p your_database_name < ADD_STORE_ID_TO_SALES_SIMPLE.sql
   ```

### Option 2: Using Prisma Migrate
If you're using Prisma migrations:
```bash
npx prisma migrate dev --name add_store_id_to_sales
```

### Option 3: Manual SQL (if above fails)
Run these SQL commands one by one:

```sql
-- Add store_id to sales table
ALTER TABLE `sales` ADD COLUMN `store_id` INT NULL AFTER `cus_id`;

-- Add index
ALTER TABLE `sales` ADD INDEX `sales_store_id_fkey` (`store_id`);

-- Add foreign key
ALTER TABLE `sales` 
ADD CONSTRAINT `sales_store_id_fkey` 
FOREIGN KEY (`store_id`) REFERENCES `stores` (`storeid`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add store_id to sale_details table
ALTER TABLE `sale_details` ADD COLUMN `store_id` INT NULL AFTER `sale_id`;

-- Add index
ALTER TABLE `sale_details` ADD INDEX `sale_details_store_id_fkey` (`store_id`);

-- Add foreign key
ALTER TABLE `sale_details` 
ADD CONSTRAINT `sale_details_store_id_fkey` 
FOREIGN KEY (`store_id`) REFERENCES `stores` (`storeid`) 
ON DELETE SET NULL ON UPDATE CASCADE;
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns exist
DESCRIBE `sales`;
DESCRIBE `sale_details`;

-- Should show `store_id` column in both tables
```

## After Migration

1. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Restart your dev server:**
   ```bash
   npm run dev
   ```

3. **Test creating a sale** - it should work now!

## Notes

- The columns are set as `NULL` to allow existing records
- Foreign keys reference the `stores` table's `storeid` column
- If constraints already exist, you may see errors - just ignore them and continue

