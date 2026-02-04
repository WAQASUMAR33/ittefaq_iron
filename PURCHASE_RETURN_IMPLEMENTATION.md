# Purchase Return Logic Implementation

## Overview
Successfully implemented purchase return functionality within the existing purchase page. The implementation allows users to create purchase returns from the same page while maintaining all existing purchase creation functionality.

## Features Implemented

### 1. **Transaction Type Dropdown**
- Located at the top of the form in a light blue section
- Two options: **New Purchase** (default) and **Purchase Return**
- Clean styling with icons (Shopping Cart for New Purchase, Trending Down for Return)
- Automatically resets related fields when switching between types

### 2. **Purchase Search Field (for Returns)**
- Only visible when "Purchase Return" is selected
- Provides real-time search functionality with autocomplete
- Searches by:
  - Invoice Number
  - Supplier Name (Customer Name)
  - Purchase ID
- Displays search results with:
  - Invoice Number
  - Supplier Name
  - Total Amount
  - Purchase Date

### 3. **Auto-Load Purchase Data**
- When a purchase is selected for return, all data is automatically loaded:
  - Customer/Supplier information
  - Store information
  - All purchase details (products, quantities, prices)
  - Amounts (unloading, fare, transport, labour)
- Shows confirmation message with loaded purchase info
- Prevents need to manually re-enter data

### 4. **Conditional UI Elements**
- **Supplier dropdown**: Only visible for "New Purchase" mode
- **Vehicle field**: Only visible for "New Purchase" mode (not required for returns)
- **New Supplier button**: Only visible for "New Purchase" mode
- **Invoice search**: Only visible for "New Purchase" mode
- **Header text**: Dynamically updates to reflect mode ("Create New Purchase" vs "Create Purchase Return")

### 5. **Backend Integration**
- Added `purchase_type` field to distinguish between new purchases and returns
- Added `return_for_purchase_id` field to track which purchase a return is for
- Modified bill type to be "PURCHASE_RETURN" for return transactions

## Code Changes Made

### State Variables Added
```javascript
const [purchaseType, setPurchaseType] = useState('new'); // 'new' or 'return'
const [selectedPurchaseForReturn, setSelectedPurchaseForReturn] = useState(null);
const [purchaseSearchResults, setPurchaseSearchResults] = useState([]);
const [purchaseSearchOpen, setPurchaseSearchOpen] = useState(false);
```

### Functions Added
1. **handlePurchaseSearch(searchValue)** - Searches purchases by invoice, supplier, or ID
2. **handleLoadPurchaseForReturn(purchase)** - Loads all data from selected purchase into form

### Form Validation Updates
- Vehicle validation only required for new purchases
- Purchase selection validation required for returns
- All existing purchase validations remain intact

### Form Submission
- Includes purchase type in submission
- Includes return reference ID for return transactions
- Sets appropriate bill type based on transaction type

## User Workflow

### Creating a New Purchase (Default)
1. Page loads with "New Purchase" selected
2. Select supplier from dropdown
3. Enter invoice number
4. Select vehicle
5. Select products and add to cart
6. Enter amounts if needed
7. Submit to create purchase

### Creating a Purchase Return
1. Select "Purchase Return" from Transaction Type dropdown
2. Purchase search field appears
3. Search for purchase by invoice number, supplier name, or purchase ID
4. Select purchase from results
5. All purchase data loads automatically
6. Supplier field shows loaded customer
7. Enter new invoice number for the return
8. All product details are pre-filled
9. Submit to create purchase return

## Benefits
- ✅ **Single Page**: No need to navigate to separate purchase return page
- ✅ **No Data Re-entry**: All purchase details auto-load
- ✅ **Search Functionality**: Easy to find purchases to return
- ✅ **Maintains Existing Features**: New purchase creation works exactly as before
- ✅ **Clean UI**: Conditional rendering keeps form uncluttered
- ✅ **Better UX**: Clear indicators of which mode is active

## Testing Checklist
- [ ] Verify dropdown shows both "New Purchase" and "Purchase Return" options
- [ ] Test switching between modes
- [ ] Search for purchases by invoice number
- [ ] Search for purchases by supplier name
- [ ] Search for purchases by purchase ID
- [ ] Verify correct data loads when purchase is selected
- [ ] Verify supplier dropdown is hidden in return mode
- [ ] Verify vehicle field is hidden in return mode
- [ ] Submit new purchase and verify it saves
- [ ] Submit purchase return and verify it saves with correct type
- [ ] Check database to confirm purchase_type and return_for_purchase_id are saved

## Files Modified
- [src/app/dashboard/purchases/page.js](src/app/dashboard/purchases/page.js) - Main purchase page with new functionality
