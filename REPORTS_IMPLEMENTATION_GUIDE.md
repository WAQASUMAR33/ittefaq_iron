# Reports System - Implementation Guide

## ✅ What Has Been Completed

### 1. API Endpoints (`src/app/api/reports/route.js`)
Complete API with 7 report types:
- ✅ Sales Report by Date Range
- ✅ Sales Report by Customer
- ✅ Customers Balance Report
- ✅ Customer Ledger Report
- ✅ Purchase Report by Date Range
- ✅ Purchase Report by Supplier
- ✅ Expense Report by Date Range

### 2. Navigation & UI
- ✅ Reports Dashboard (`src/app/dashboard/reports/page.js`)
- ✅ Sidebar updated with Reports dropdown menu
- ✅ All 7 report types as sub-menu items
- ✅ Sales by Date report page (full implementation)

### 3. Report Template Created
- ✅ Comprehensive template with filters, print, and export functionality
- ✅ Responsive design with print styles
- ✅ Summary cards with statistics
- ✅ Detailed tables with totals

## 📋 How to Create Remaining Report Pages

All report pages follow the same template as `sales-by-date/page.js`. Here's how to create each one:

### General Template Structure

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';
import { Icons } from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Add additional filters as needed

  const fetchReport = async () => {
    // Validate inputs
    // Call API with appropriate parameters
    // Set report data
  };

  const handlePrint = () => window.print();
  
  const handleExport = () => {
    // Create CSV from report data
    // Download file
  };

  return (
    <DashboardLayout>
      {/* Header */}
      {/* Filters */}
      {/* Summary Cards */}
      {/* Data Table */}
      {/* Print Styles */}
    </DashboardLayout>
  );
}
```

## 📝 Specific Implementation for Each Report

### 1. Sales Report (Customer Wise)
**File**: `src/app/dashboard/reports/sales-by-customer/page.js`

**API Call**:
```javascript
const response = await fetch(`/api/reports?type=sales-by-customer&startDate=${startDate}&endDate=${endDate}`);
```

**Key Differences from Date Report**:
- Groups sales by customer
- Shows customer totals
- Displays expandable customer details

**Summary Cards**:
- Total Customers
- Total Sales Count
- Net Total
- Total Payments

**Table Columns**:
- Customer Name
- Sales Count
- Total Amount
- Discount
- Shipping
- Net Total
- Payments

---

### 2. Customers Balance Report
**File**: `src/app/dashboard/reports/customers-balance/page.js`

**API Call**:
```javascript
const response = await fetch(`/api/reports?type=customers-balance`);
```

**No Date Filters** - Shows current balance for all customers

**Summary Cards**:
- Total Customers
- Total Balance
- Credit Balance (positive)
- Debit Balance (negative)

**Table Columns**:
- Customer Name
- Phone
- City
- Category
- Type
- Current Balance
- Status (Credit/Debit indicator)

**Special Features**:
- Color code balances (green for credit, red for debit)
- Sort by balance amount
- Filter by balance type

---

### 3. Customer Ledger
**File**: `src/app/dashboard/reports/customer-ledger/page.js`

**API Call**:
```javascript
const response = await fetch(`/api/reports?type=customer-ledger&customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`);
```

**Additional Filter**:
- Customer dropdown selection (required)

**Summary Cards**:
- Opening Balance
- Total Debit
- Total Credit
- Closing Balance

**Table Columns**:
- Date
- Transaction Type
- Bill Number
- Details
- Debit Amount
- Credit Amount
- Balance
- Payments

**Special Features**:
- Running balance calculation
- Transaction details view
- Export ledger statement

---

### 4. Purchase Report (By Date)
**File**: `src/app/dashboard/reports/purchases-by-date/page.js`

**API Call**:
```javascript
const response = await fetch(`/api/reports?type=purchases-by-date&startDate=${startDate}&endDate=${endDate}`);
```

**Similar to Sales by Date but for Purchases**

**Summary Cards**:
- Total Purchases
- Total Amount
- Total Unloading
- Total Fare
- Total Discount
- Net Total

**Table Columns**:
- Date
- Purchase ID
- Supplier
- Items Count
- Amount
- Unloading
- Fare
- Discount
- Net Total
- Payment

---

### 5. Purchase Report (Supplier Wise)
**File**: `src/app/dashboard/reports/purchases-by-supplier/page.js`

**API Call**:
```javascript
const response = await fetch(`/api/reports?type=purchases-by-supplier&startDate=${startDate}&endDate=${endDate}`);
```

**Groups purchases by supplier**

**Summary Cards**:
- Total Suppliers
- Total Purchases
- Net Total
- Total Payments

**Table Columns**:
- Supplier Name
- Purchases Count
- Total Amount
- Unloading
- Fare
- Discount
- Net Total
- Payments

---

### 6. Expense Report
**File**: `src/app/dashboard/reports/expenses-by-date/page.js`

**API Call**:
```javascript
const response = await fetch(`/api/reports?type=expenses-by-date&startDate=${startDate}&endDate=${endDate}`);
```

**Summary Cards**:
- Total Expenses
- Total Amount
- Expense Types Count
- Average per Day

**Table Columns**:
- Date
- Expense Type
- Title
- Details
- Amount
- Created By

**Special Features**:
- Group by expense type
- Show type totals
- Pie chart visualization (optional)

---

## 🎨 Standard Features for All Reports

### 1. Filters Section
```javascript
<div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {/* Filter inputs */}
  </div>
</div>
```

### 2. Action Buttons
```javascript
<div className="flex items-center justify-end space-x-3 print:hidden">
  <button onClick={handleExport} className="...">
    <Download className="w-4 h-4 mr-2" />
    Export CSV
  </button>
  <button onClick={handlePrint} className="...">
    <Printer className="w-4 h-4 mr-2" />
    Print
  </button>
</div>
```

### 3. Summary Cards Grid
```javascript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Summary cards */}
</div>
```

### 4. Print Header
```javascript
<div className="hidden print:block mb-6">
  <div className="text-center">
    <h1 className="text-3xl font-bold text-gray-900">Itefaq Builders</h1>
    <h2 className="text-xl font-semibold text-gray-700 mt-2">Report Title</h2>
    <p className="text-gray-600 mt-1">Report Parameters</p>
  </div>
  <hr className="my-4 border-gray-300" />
</div>
```

### 5. Print Styles
```javascript
<style jsx global>{`
  @media print {
    body * {
      visibility: hidden;
    }
    .print\\:block, .print\\:block * {
      visibility: visible;
    }
    .print\\:hidden {
      display: none !important;
    }
  }
`}</style>
```

## 📊 CSV Export Template

```javascript
const handleExport = () => {
  if (!reportData) return;

  // Create CSV header
  let csv = 'Column1,Column2,Column3,...\n';
  
  // Add data rows
  reportData.items.forEach(item => {
    csv += `${item.col1},${item.col2},${item.col3},...\n`;
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-name-${startDate}-to-${endDate}.csv`;
  a.click();
};
```

## 🔧 Quick Copy-Paste Template

For the remaining reports, copy `sales-by-date/page.js` and modify:

1. **Change imports and component name**
2. **Update API call type parameter**
3. **Modify filter inputs as needed**
4. **Update summary cards with appropriate data**
5. **Change table columns to match report data**
6. **Update CSV export columns**
7. **Update print header title**

## 🎯 Testing Checklist

For each report:
- [ ] Filters work correctly
- [ ] API returns correct data
- [ ] Summary cards show accurate totals
- [ ] Table displays all data
- [ ] Sorting works (if implemented)
- [ ] Export CSV downloads correctly
- [ ] Print layout looks good
- [ ] Responsive on mobile
- [ ] Loading states work
- [ ] Error handling works

## 📦 File Structure

```
src/app/dashboard/reports/
├── page.js                          ✅ (Dashboard)
├── sales-by-date/
│   └── page.js                      ✅ (Complete)
├── sales-by-customer/
│   └── page.js                      📝 (Copy & modify template)
├── customers-balance/
│   └── page.js                      📝 (Copy & modify template)
├── customer-ledger/
│   └── page.js                      📝 (Copy & modify template)
├── purchases-by-date/
│   └── page.js                      📝 (Copy & modify template)
├── purchases-by-supplier/
│   └── page.js                      📝 (Copy & modify template)
└── expenses-by-date/
    └── page.js                      📝 (Copy & modify template)
```

## 💡 Tips

1. **Start with sales-by-date template** - It has all the features you need
2. **Test API first** - Make sure data is returning correctly
3. **Mobile-first** - Design for mobile, enhance for desktop
4. **Print preview** - Always test print layout
5. **CSV format** - Keep it simple and Excel-compatible
6. **Loading states** - Show spinners during data fetch
7. **Empty states** - Handle no data gracefully
8. **Error handling** - Show meaningful error messages

## 🚀 Quick Start

To create a new report page:

1. Copy the template from `sales-by-date/page.js`
2. Replace report type in API call
3. Update column headers and data mapping
4. Test with real data
5. Verify print and export work

All report pages are now accessible through:
**Dashboard → Reports → [Select Report Type]**

Happy reporting! 📊


