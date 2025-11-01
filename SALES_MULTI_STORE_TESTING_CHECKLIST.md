# Sales Multi-Store Stock Testing Checklist

This document provides a comprehensive testing checklist for verifying that the sales page is working correctly with multi-store stock functionality.

## Prerequisites
- [ ] Database has `store_stocks` table created (via migration `add_store_stock_functionality.sql`)
- [ ] `sales` table has `store_id` column
- [ ] `sale_details` table has `store_id` column
- [ ] At least 2 stores exist in the database
- [ ] At least 2 products exist in the database
- [ ] Store stocks are initialized for products in stores

## Test Scenarios

### 1. Store Selection and Auto-Selection

#### 1.1 Store Dropdown Display
- [ ] Navigate to Sales page (`/dashboard/sales`)
- [ ] Switch to "Create New Sale" view
- [ ] Verify store dropdown is visible
- [ ] Verify store dropdown is populated with available stores
- [ ] Verify first store is auto-selected when page loads

#### 1.2 Store Selection
- [ ] Select a different store from dropdown
- [ ] Verify selected store is displayed (bold styling)
- [ ] Verify store selection persists when adding products
- [ ] Change store selection
- [ ] Verify store selection updates correctly

### 2. Product Stock Display

#### 2.1 Stock Fetching
- [ ] Select a store
- [ ] Select a product from product dropdown
- [ ] Verify stock quantity is fetched and displayed
- [ ] Verify stock is shown as a number (not null/undefined)
- [ ] Verify stock displays correctly in the form

#### 2.2 Stock Updates on Store Change
- [ ] Select Store A
- [ ] Select Product X
- [ ] Note the stock quantity for Store A
- [ ] Change to Store B
- [ ] Verify stock quantity updates automatically
- [ ] Verify stock quantity matches Store B's stock for Product X

#### 2.3 Stock Updates on Product Change
- [ ] Select Store A
- [ ] Select Product X, note stock
- [ ] Select Product Y
- [ ] Verify stock updates to Store A's stock for Product Y

### 3. Stock Availability Validation

#### 3.1 Valid Stock Sale
- [ ] Select Store A
- [ ] Select Product X with sufficient stock (e.g., stock = 50)
- [ ] Enter quantity = 10
- [ ] Add product to table
- [ ] Verify product is added successfully
- [ ] Verify stock in form decreases by 10 (shows available stock)
- [ ] Add same product again with quantity = 5
- [ ] Verify stock decreases further (shows available stock)

#### 3.2 Insufficient Stock
- [ ] Select Store A
- [ ] Select Product X with low stock (e.g., stock = 5)
- [ ] Try to add quantity = 10
- [ ] Verify error message appears: "Insufficient stock" or similar
- [ ] Verify sale is not created

#### 3.3 Stock Checking Before Sale Creation
- [ ] Select Store A
- [ ] Add Product X with quantity = 10
- [ ] Before saving, verify stock shows as (original - 10)
- [ ] Save the sale
- [ ] Verify sale is created successfully
- [ ] Verify stock is actually decremented in database

### 4. Sale Creation with Multi-Store Stock

#### 4.1 Basic Sale Creation
- [ ] Select Store A
- [ ] Select Customer
- [ ] Add Product X (quantity: 5)
- [ ] Add Product Y (quantity: 3)
- [ ] Fill in payment details
- [ ] Click "Save Bill"
- [ ] Verify sale is created successfully
- [ ] Verify store_id is saved in sales table
- [ ] Verify store_id is saved in sale_details table
- [ ] Verify stock is decremented for Store A only

#### 4.2 Verify Stock Isolation Between Stores
- [ ] Note Product X stock in Store A (e.g., 50)
- [ ] Note Product X stock in Store B (e.g., 30)
- [ ] Create sale from Store A with Product X (quantity: 10)
- [ ] Verify Store A stock is now 40
- [ ] Verify Store B stock remains 30 (unchanged)
- [ ] Create sale from Store B with Product X (quantity: 5)
- [ ] Verify Store B stock is now 25
- [ ] Verify Store A stock remains 40 (unchanged)

#### 4.3 Multiple Products from Same Store
- [ ] Select Store A
- [ ] Add Product X (quantity: 10)
- [ ] Add Product Y (quantity: 5)
- [ ] Add Product Z (quantity: 3)
- [ ] Save sale
- [ ] Verify all products' stock are decremented in Store A
- [ ] Verify sale_details all have store_id = Store A

#### 4.4 Stock Reservation (In-Progress Sales)
- [ ] Select Store A
- [ ] Add Product X (quantity: 10) to table (but don't save yet)
- [ ] Verify available stock decreases by 10 in the form
- [ ] Add same Product X again (quantity: 5)
- [ ] Verify available stock shows (original - 15)
- [ ] Remove one item from table
- [ ] Verify available stock increases accordingly

### 5. Sale Update with Multi-Store Stock

#### 5.1 Update Sale - Same Store
- [ ] Create a sale from Store A with Product X (quantity: 10)
- [ ] Verify Store A stock decreased by 10
- [ ] Edit the sale and change quantity to 15
- [ ] Save update
- [ ] Verify Store A stock is decremented by additional 5 (total -15)
- [ ] Verify old stock (10) was restored first, then new quantity (15) was deducted

#### 5.2 Update Sale - Change Store
- [ ] Create a sale from Store A with Product X (quantity: 10)
- [ ] Verify Store A stock decreased by 10
- [ ] Edit the sale and change store to Store B
- [ ] Save update
- [ ] Verify Store A stock is restored (+10)
- [ ] Verify Store B stock is decremented (-10)
- [ ] Verify sale and sale_details have store_id = Store B

#### 5.3 Update Sale - Change Products
- [ ] Create a sale from Store A with Product X (quantity: 10)
- [ ] Edit and replace Product X with Product Y (quantity: 5)
- [ ] Save update
- [ ] Verify Store A stock for Product X is restored (+10)
- [ ] Verify Store A stock for Product Y is decremented (-5)

### 6. Sale Deletion with Stock Restoration

#### 6.1 Delete Sale
- [ ] Create a sale from Store A with Product X (quantity: 10)
- [ ] Note Store A stock after sale (e.g., 40)
- [ ] Delete the sale
- [ ] Verify Store A stock is restored (+10) to original (50)
- [ ] Verify sale is deleted from database
- [ ] Verify sale_details are deleted

### 7. API Testing

#### 7.1 Store Stock API
- [ ] Test GET `/api/store-stock?store_id=1&pro_id=1`
- [ ] Verify response format: `{ store_id, product_id, stock_quantity }`
- [ ] Verify stock_quantity matches database value
- [ ] Test with non-existent store/product
- [ ] Verify appropriate error handling

#### 7.2 Sales API - POST
- [ ] Test POST `/api/sales` with store_id
- [ ] Verify store_id is required (400 error if missing)
- [ ] Verify stock availability check works
- [ ] Verify stock is decremented after sale creation
- [ ] Verify store_id is saved in sale and sale_details

#### 7.3 Sales API - PUT
- [ ] Test PUT `/api/sales` with store_id
- [ ] Verify stock is restored when updating sale
- [ ] Verify new stock is decremented after update
- [ ] Verify store_id can be updated
- [ ] Verify stock check happens for new quantities

#### 7.4 Sales API - DELETE
- [ ] Test DELETE `/api/sales?id=X`
- [ ] Verify stock is restored when deleting sale
- [ ] Verify sale and sale_details are deleted

### 8. Edge Cases

#### 8.1 Concurrent Sales
- [ ] Open two browser tabs
- [ ] Tab 1: Create sale from Store A with Product X (quantity: 10)
- [ ] Tab 2: Before Tab 1 saves, create sale from Store A with Product X (quantity: 10)
- [ ] Save both sales
- [ ] Verify stock is correctly decremented twice
- [ ] Verify both sales are created successfully

#### 8.2 Zero Stock
- [ ] Set Product X stock in Store A to 0
- [ ] Try to create sale with Product X (quantity: 1)
- [ ] Verify error: "Insufficient stock"
- [ ] Verify sale is not created

#### 8.3 Negative Stock Prevention
- [ ] Set Product X stock in Store A to 5
- [ ] Try to create sale with Product X (quantity: 10)
- [ ] Verify error prevents sale creation
- [ ] Verify stock remains 5 (not -5)

#### 8.4 Missing Store Selection
- [ ] Don't select any store
- [ ] Try to add product
- [ ] Verify error: "Please select a store"
- [ ] Try to save sale without store
- [ ] Verify error: "Please select a store"

#### 8.5 Store Deletion Handling
- [ ] Create sale with Store A
- [ ] Delete Store A from database (if possible)
- [ ] Verify sale still has store_id reference
- [ ] Verify stock restoration doesn't fail (graceful handling)

### 9. Database Verification

#### 9.1 Direct Database Checks
- [ ] After creating sale, verify in database:
  - [ ] `sales.store_id` matches selected store
  - [ ] `sale_details.store_id` matches selected store
  - [ ] `store_stocks.stock_quantity` decreased correctly
  - [ ] Stock decrease matches sale quantity exactly

#### 9.2 Transaction Integrity
- [ ] Create sale with multiple products
- [ ] Verify all-or-nothing: if one product fails, entire sale rolls back
- [ ] Verify stock is not partially decremented on error

### 10. UI/UX Testing

#### 10.1 Stock Display
- [ ] Verify stock is displayed clearly in product form
- [ ] Verify stock updates in real-time when store/product changes
- [ ] Verify stock shows correct "available" quantity (accounting for items in table)

#### 10.2 Error Messages
- [ ] Verify clear error messages for insufficient stock
- [ ] Verify error messages include available vs required quantities
- [ ] Verify error messages appear in snackbar/toast

#### 10.3 Loading States
- [ ] Verify loading indicator when fetching stock
- [ ] Verify loading indicator when saving sale
- [ ] Verify UI doesn't freeze during stock operations

### 11. Performance Testing

#### 11.1 Stock Fetching Performance
- [ ] Verify stock fetching is fast (< 500ms)
- [ ] Verify multiple stock fetches don't block UI
- [ ] Verify stock caching if applicable

#### 11.2 Sale Creation Performance
- [ ] Create sale with 10+ products
- [ ] Verify creation time is acceptable (< 2s)
- [ ] Verify stock updates happen efficiently

### 12. Integration Testing

#### 12.1 With Purchase Module
- [ ] Add stock to Store A via Purchase
- [ ] Verify stock increases in Store A
- [ ] Create sale from Store A
- [ ] Verify stock decreases correctly
- [ ] Verify stock isolation from Store B

#### 12.2 With Sale Returns
- [ ] Create sale from Store A
- [ ] Return sale
- [ ] Verify stock is restored to Store A
- [ ] Verify stock in other stores unchanged

#### 12.3 With Reports
- [ ] Generate sales report filtered by store
- [ ] Verify report shows correct store-specific sales
- [ ] Verify stock reports show per-store stock

## Test Data Setup

### Required Test Data
```sql
-- Create test stores
INSERT INTO stores (store_name, store_address) VALUES ('Store A', 'Address A');
INSERT INTO stores (store_name, store_address) VALUES ('Store B', 'Address B');

-- Create test products
INSERT INTO products (pro_title, pro_unit, pro_baser_price, pro_stock_qnty) 
VALUES ('Product X', 'PCS', 100, 50), ('Product Y', 'PCS', 200, 30);

-- Initialize store stocks
INSERT INTO store_stocks (store_id, pro_id, stock_quantity, min_stock, max_stock)
VALUES 
  (1, 1, 50, 0, 100),  -- Store A, Product X
  (1, 2, 30, 0, 100),  -- Store A, Product Y
  (2, 1, 40, 0, 100),  -- Store B, Product X
  (2, 2, 20, 0, 100);  -- Store B, Product Y
```

## Notes

- All stock operations should be atomic (use database transactions)
- Stock should never go negative
- Store selection should persist during sale creation
- Stock display should update in real-time
- Error messages should be user-friendly
- Database integrity should be maintained at all times

## Known Issues Fixed

- ✅ PUT handler now extracts `store_id` from request body
- ✅ PUT handler now includes `store_id` in sale_details creation
- ✅ PUT handler now checks stock availability before updating
- ✅ Stock restoration happens correctly when updating/deleting sales

## Status

- [ ] All tests passed
- [ ] Issues identified and logged
- [ ] Performance acceptable
- [ ] Ready for production

---

**Last Updated:** {{ current_date }}
**Tester:** _______________
**Status:** In Progress / Complete

