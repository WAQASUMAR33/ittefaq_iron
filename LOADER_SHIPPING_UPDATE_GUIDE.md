# Loader and Shipping Amount Feature - Setup Guide

## ✅ What Was Done

### 1. Database Schema Updates
- Added `loader_id` field to `Sale` model (references Loader)
- Added `shipping_amount` field to `Sale` model
- Created proper foreign key relations

### 2. API Updates (`src/app/api/sales/route.js`)
- Updated POST endpoint to handle `loader_id` and `shipping_amount`
- Updated PUT endpoint to handle `loader_id` and `shipping_amount`
- Updated GET endpoints to include loader information in responses

### 3. UI Updates (`src/app/dashboard/sales/page.js`)
- Added loader dropdown (fetches from `/api/loaders`)
- Added shipping amount input field
- Both fields are optional
- Form now displays:
  - Loader/Transport selector with all available loaders
  - Shipping/Transport Amount field

## 🔧 Required Steps to Complete Setup

### Step 1: Stop the Development Server
First, stop your Next.js development server if it's running:
```
Press Ctrl+C in the terminal where npm run dev is running
```

### Step 2: Apply Database Migration Manually

Since your database doesn't allow shadow database creation, you need to run the SQL migration manually:

1. Log into your MySQL database (use phpMyAdmin, MySQL Workbench, or command line)

2. Run the following SQL commands:

```sql
-- Add loader_id column to sales table
ALTER TABLE `sales` ADD COLUMN `loader_id` VARCHAR(191) NULL AFTER `credit_account_id`;

-- Add shipping_amount column to sales table
ALTER TABLE `sales` ADD COLUMN `shipping_amount` DECIMAL(65,30) NOT NULL DEFAULT 0 AFTER `loader_id`;

-- Add foreign key constraint for loader_id
ALTER TABLE `sales` ADD CONSTRAINT `sales_loader_id_fkey` 
FOREIGN KEY (`loader_id`) REFERENCES `loaders`(`loader_id`) ON DELETE SET NULL ON UPDATE CASCADE;
```

**OR** use the prepared SQL file:
- Open `prisma/migrations/manual_add_loader_shipping.sql`
- Copy all commands and run them in your MySQL client

### Step 3: Generate Prisma Client

After applying the database migration, generate the Prisma client:

```powershell
cd "d:\itefaq builders"
npx prisma generate
```

### Step 4: Restart Development Server

```powershell
npm run dev
```

## 📋 How to Use the New Features

### Adding Loader and Shipping Info to a Sale:

1. Go to Sales page
2. Click "Add New Sale"
3. Fill in all the required customer and product information
4. In the "Sale Information" section, you'll find two new fields:
   - **Loader/Transport**: Optional dropdown to select a loader
   - **Shipping/Transport Amount**: Optional field to enter shipping cost
5. Submit the sale

### The fields work as follows:
- **Loader**: Optional - Select from existing loaders in your system
- **Shipping Amount**: Optional - Enter the transport/shipping cost for this sale
- Both fields are saved with the sale and can be viewed/edited later

## 📊 Database Structure

```
sales table now includes:
- loader_id (VARCHAR, nullable, FK to loaders.loader_id)
- shipping_amount (DECIMAL, default 0)
```

## 🔍 Verification

After completing the steps, verify everything works:

1. ✅ No database errors when starting the server
2. ✅ Sales form shows "Loader/Transport" dropdown
3. ✅ Sales form shows "Shipping/Transport Amount" field
4. ✅ You can create a new sale with loader and shipping information
5. ✅ Sales list shows the loader information when viewing sales

## 🐛 Troubleshooting

### Error: "Column 'loader_id' doesn't exist"
- The database migration wasn't applied. Go back to Step 2.

### Error: "EPERM: operation not permitted" when running prisma generate
- Make sure the dev server is stopped completely before running this command.

### Loader dropdown is empty
- Make sure you have loaders in your system (create them in Loader Management page first)
- Check that `/api/loaders` endpoint is working correctly

## 📝 Notes

- The loader and shipping amount fields are **optional** - you can leave them empty
- Shipping amount defaults to 0 if not specified
- Loader selection helps track which transport company/person handled each sale
- This information can be used for transport reports and loader payment tracking












