-- Migration: Convert all primary keys from String CUID to Numeric Auto-Increment
-- WARNING: This will DROP ALL TABLES and recreate them
-- Make sure you have a backup before running this!

SET FOREIGN_KEY_CHECKS = 0;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS `sale_return_details`;
DROP TABLE IF EXISTS `sale_returns`;
DROP TABLE IF EXISTS `split_payments`;
DROP TABLE IF EXISTS `sale_details`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `purchase_details`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `ledger`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `expense_titles`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `sub_categories`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `customer_types`;
DROP TABLE IF EXISTS `customer_categories`;
DROP TABLE IF EXISTS `cities`;
DROP TABLE IF EXISTS `vehicles`;
DROP TABLE IF EXISTS `loaders`;
DROP TABLE IF EXISTS `cargo`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- Tables will be recreated by Prisma with: npx prisma db push



