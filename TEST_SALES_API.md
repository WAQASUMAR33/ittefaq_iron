# Sales API Test Script

This test script helps verify that sales records are being fetched correctly from the API.

## Prerequisites

- Node.js 18+ (for built-in `fetch`) or install `node-fetch`
- Your Next.js dev server should be running on `http://localhost:3000`

## Usage

### Basic Usage

```bash
# Make sure your dev server is running first
npm run dev

# In another terminal, run the test script
node test-sales-api.js
```

### Custom API URL

```bash
API_URL=http://localhost:3001 node test-sales-api.js
```

## What the Script Tests

1. **Get All Sales**
   - Fetches all sales from `/api/sales`
   - Validates response structure
   - Checks required and optional fields
   - Validates data types
   - Shows sample sale data

2. **Get Single Sale**
   - Fetches a single sale by ID
   - Validates the response structure

3. **Database Query Test**
   - Tests response serialization
   - Checks for BigInt issues
   - Measures response size

## Expected Output

The script will show:
- ✅ Green for successful checks
- ⚠️ Yellow for warnings
- ❌ Red for errors
- 📊 Blue for information

## Troubleshooting

### "fetch is not available"
- Use Node.js 18+ which has built-in fetch
- Or install node-fetch: `npm install node-fetch`
- Then modify the script to import it

### "ECONNREFUSED"
- Make sure your Next.js dev server is running
- Check the API_URL is correct

### "No sales found"
- This is normal if you haven't created any sales yet
- Create a test sale through the UI first

### Sales not loading in UI
- Check the test script output for any errors
- Verify the API response structure matches what the frontend expects
- Check browser console for frontend errors

## Example Output

```
============================================================
SALES API TEST SUITE
============================================================

Testing API at: http://localhost:3000
Date: 2024-01-15T10:30:00.000Z

============================================================
TEST 1: Get All Sales
============================================================
📡 Fetching all sales from /api/sales...
Status: 200 OK
✅ Successfully fetched 2 sales

📋 Checking first sale structure:

Required fields check:
  ✅ sale_id: 1
  ✅ total_amount: 900
  ✅ discount: 0
  ✅ payment: 550
  ✅ payment_type: CASH
  ✅ cus_id: 2
  ✅ created_at: 2024-01-15T10:00:00.000Z

Optional fields check:
  ✅ customer: John Doe
  ✅ sale_details: 1 items
  ✅ shipping_amount: 500
  ✅ bill_type: BILL
  ⚠️  reference: not present

📊 Data type validation:
  ✅ sale_id: 1 (number)
  ✅ total_amount: 900 (number)
  ✅ payment: 550 (number)
  ✅ customer: Object
  ✅ sale_details: Array with 1 items

📄 Sample Sale Data:
{
  "sale_id": 1,
  "total_amount": 900,
  ...
}

============================================================
TEST SUMMARY
============================================================
✅ Found 2 sales in database
✅ All tests completed successfully
```

