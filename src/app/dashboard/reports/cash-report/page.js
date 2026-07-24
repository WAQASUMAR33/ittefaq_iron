'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Search, Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';
import { Autocomplete, TextField } from '@mui/material';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Map ledger amounts to correct debit/credit columns based on trnx_type
const getLedgerEntryDisplayAmounts = (entry) => {
  const debitAmt = parseFloat(entry.debit_amount || 0);
  const creditAmt = parseFloat(entry.credit_amount || 0);
  const entryAmount = debitAmt > 0 ? debitAmt : creditAmt;

  if (entry.trnx_type === 'DEBIT') {
    return { debit: entryAmount, credit: 0 };
  } else if (entry.trnx_type === 'CREDIT') {
    return { debit: 0, credit: entryAmount };
  } else {
    return { debit: debitAmt, credit: creditAmt };
  }
};

function excludeMemoFromBankCashSummary(entries) {
  return entries.filter((e) => {
    const det = e.details || '';
    if (!det.includes('no receivable change')) return true;
    const d = parseFloat(e.debit_amount || 0);
    const c = parseFloat(e.credit_amount || 0);
    if (d > 0 && c > 0 && Math.abs(d - c) < 0.02) return false;
    return true;
  });
}

export default function CashReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // Screen default: descending

  // Auto-fetch report when dates are set
  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchCategories(); fetchStores(); }, []);

  useEffect(() => {
    if (selectedCategory) { fetchAccountsByCategory(selectedCategory); }
    else { setAccounts([]); setSelectedAccount(''); }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/customer-category');
      const data = await response.json();
      if (response.ok) setCategories(data);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchAccountsByCategory = async (categoryId) => {
    try {
      const response = await fetch(`/api/customers?category=${categoryId}&dropdown=true`);
      const data = await response.json();
      if (response.ok) setAccounts(data);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const result = await response.json();
      if (response.ok && result.success && Array.isArray(result.data)) {
        setStores(result.data);
      } else {
        console.error('Stores API did not return valid data:', result);
        setStores([]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    }
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) { return; }
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=cash-report&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (response.ok) {
        let filteredData = { ...data };
        // Sort ledger entries chronologically (ascending) for core running balance & totals calculation
        if (filteredData.ledgerEntries && Array.isArray(filteredData.ledgerEntries)) {
          filteredData.ledgerEntries = [...filteredData.ledgerEntries].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.l_id - b.l_id;
          });
        }
        if (selectedCategory) {
          filteredData.ledgerEntries = data.ledgerEntries.filter(e => e.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
          filteredData.cashSales = data.cashSales.filter(s => s.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
          filteredData.cashPurchases = data.cashPurchases.filter(p => p.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
        }
        if (selectedAccount) {
          filteredData.ledgerEntries = filteredData.ledgerEntries.filter(e => e.customer?.cus_id === parseInt(selectedAccount));
          filteredData.cashSales = filteredData.cashSales.filter(s => s.customer?.cus_id === parseInt(selectedAccount));
          filteredData.cashPurchases = filteredData.cashPurchases.filter(p => p.customer?.cus_id === parseInt(selectedAccount));
        }
        if (selectedStore) {
          filteredData.cashSales = filteredData.cashSales.filter(s => s.store_id === parseInt(selectedStore));
          filteredData.cashPurchases = filteredData.cashPurchases.filter(p => p.store_id === parseInt(selectedStore));
        }
        if (selectedPaymentType) {
          if (selectedPaymentType === 'CASH') {
            filteredData.cashSales = filteredData.cashSales.filter(s => s.payment_type === 'CASH' || s.cash_payment > 0);
            filteredData.cashPurchases = filteredData.cashPurchases.filter(p => p.payment_type === 'CASH' || p.cash_payment > 0);
          } else if (selectedPaymentType === 'BANK') {
            filteredData.cashSales = filteredData.cashSales.filter(s => s.payment_type === 'BANK_TRANSFER' || s.bank_payment > 0);
            filteredData.cashPurchases = filteredData.cashPurchases.filter(p => p.payment_type === 'BANK_TRANSFER' || p.bank_payment > 0);
          }
        }
        const forSum = excludeMemoFromBankCashSummary(filteredData.ledgerEntries);
        filteredData.summary = {
          ...data.summary,
          totalLedgerDebit: forSum.reduce((sum, l) => {
            const { debit } = getLedgerEntryDisplayAmounts(l);
            return sum + debit;
          }, 0),
          totalLedgerCredit: forSum.reduce((sum, l) => {
            const { credit } = getLedgerEntryDisplayAmounts(l);
            return sum + credit;
          }, 0),
          totalCashSales: filteredData.cashSales.reduce((sum, s) => sum + parseFloat(s.payment || 0), 0),
          totalCashPurchases: filteredData.cashPurchases.reduce((sum, p) => sum + parseFloat(p.payment || 0), 0),
        };
        setReportData(filteredData);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleExport = () => {
    if (!reportData) return;
    let csv = 'CASH BOOK\n';
    csv += `Period: ${formatDate(startDate)} to ${formatDate(endDate)}\n\n`;
    csv += 'S.No,Date,Voucher Type,Account,Description,Debit (Dr),Credit (Cr),Balance\n';
    reportData.ledgerEntries.forEach((entry, i) => {
      const displayAmts = getLedgerEntryDisplayAmounts(entry);
      csv += `${i + 1},${formatDate(entry.created_at)},Cash,${entry.customer?.cus_name || '-'},${entry.details || '-'},${formatCurrency(displayAmts.debit)},${formatCurrency(displayAmts.credit)},${formatCurrency(entry.closing_balance)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-book-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const openingBalance = reportData?.ledgerEntries?.[0] ? parseFloat(reportData.ledgerEntries[0].opening_balance || 0) : 0;
  const closingBalance = reportData?.ledgerEntries?.length > 0
    ? parseFloat(reportData.ledgerEntries[reportData.ledgerEntries.length - 1].closing_balance || 0)
    : openingBalance;

  // Screen entries order (default descending: newest on top)
  const screenEntries = reportData?.ledgerEntries
    ? (sortOrder === 'desc' ? [...reportData.ledgerEntries].reverse() : reportData.ledgerEntries)
    : [];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white print:bg-white overflow-hidden">
        {/* Screen Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white px-6 py-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Cash Book</h1>
                  <p className="text-emerald-200 text-sm">Cash receipts and payments ledger</p>
                </div>
              </div>
            </div>
            {reportData && (
              <div className="flex items-center space-x-2">
                <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </button>
                <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                  <Printer className="w-4 h-4 mr-2" /> Print
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-6 py-3 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">FROM DATE</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">TO DATE</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div className="flex-1 min-w-[180px] max-w-[220px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1 caps">CATEGORY</label>
              <Autocomplete
                size="small"
                options={categories}
                getOptionLabel={(option) => option.cus_cat_title || ''}
                value={categories.find(c => c.cus_cat_id === parseInt(selectedCategory)) || null}
                onChange={(e, val) => setSelectedCategory(val ? val.cus_cat_id.toString() : '')}
                autoSelect={true}
                autoHighlight={true}
                openOnFocus={true}
                selectOnFocus={true}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="All Categories"
                    onFocus={(e) => e.target.select()}
                    sx={{
                      '& .MuiOutlinedInput-root': { py: '2px', borderRadius: '8px', bgcolor: 'white' }
                    }}
                  />
                )}
              />
            </div>
            <div className="flex-1 min-w-[180px] max-w-[220px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1 caps">ACCOUNT</label>
              <Autocomplete
                size="small"
                disabled={!selectedCategory}
                options={accounts}
                getOptionLabel={(option) => option.cus_name || ''}
                value={accounts.find(a => a.cus_id === parseInt(selectedAccount)) || null}
                onChange={(e, val) => setSelectedAccount(val ? val.cus_id.toString() : '')}
                autoSelect={true}
                autoHighlight={true}
                openOnFocus={true}
                selectOnFocus={true}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="All Accounts"
                    onFocus={(e) => e.target.select()}
                    sx={{
                      '& .MuiOutlinedInput-root': { py: '2px', borderRadius: '8px', bgcolor: selectedCategory ? 'white' : '#f1f5f9' }
                    }}
                  />
                )}
              />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">STORE</label>
              <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">All Stores</option>
                {(stores || []).map((store) => (<option key={store.storeid} value={store.storeid}>{store.store_name}</option>))}
              </select>
            </div>
            <div className="flex-1 min-w-[140px] max-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">PAYMENT TYPE</label>
              <select value={selectedPaymentType} onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">All Types</option>
                <option value="CASH">Cash Only</option>
                <option value="BANK">Bank Only</option>
              </select>
            </div>
            <div className="flex-1 min-w-[150px] max-w-[170px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">SORT (SCREEN)</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold">
                <option value="desc">Descending (Newest First)</option>
                <option value="asc">Ascending (Oldest First)</option>
              </select>
            </div>
            <button onClick={fetchReport} disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-colors min-w-[130px]">
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {reportData ? (
          <div className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible">
            <div className="max-w-[1200px] mx-auto">
              {/* Print Header */}
              <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-wider">ITTEFAQ IRON STORE</h1>
                  <p className="text-sm text-gray-600">Parianwali, Pakistan | Tel: +92 346 7560306</p>
                  <div className="mt-3 py-2 bg-black text-white">
                    <h2 className="text-lg font-bold tracking-widest">CASH BOOK</h2>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Period:</span> {formatDate(startDate)} to {formatDate(endDate)}
                  </p>
                </div>
              </div>

              {/* Summary Cards - Screen */}
              {(() => {
                const totalDebit = parseFloat(reportData.summary.totalLedgerDebit || 0);
                const totalCredit = parseFloat(reportData.summary.totalLedgerCredit || 0);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 print:hidden">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Debit (Cash In)</p>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold text-green-800 mt-1">Rs. {formatCurrency(totalDebit)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Credit (Cash Out)</p>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      </div>
                      <p className="text-2xl font-bold text-red-800 mt-1">Rs. {formatCurrency(totalCredit)}</p>
                    </div>
                    <div className={`bg-gradient-to-br ${closingBalance >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} border rounded-xl p-4`}>
                      <p className={`text-xs font-semibold ${closingBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'} uppercase tracking-wide`}>Closing Balance</p>
                      <p className={`text-2xl font-bold ${closingBalance >= 0 ? 'text-emerald-800' : 'text-orange-800'} mt-1`}>Rs. {formatCurrency(closingBalance)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Opening + Debit − Credit</p>
                    </div>
                  </div>
                );
              })()}

              {/* Print Summary */}
              <div className="hidden print:block mb-4 border border-black">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold border-r border-black w-1/3">Total Debit (Cash In):</td>
                      <td className="p-2 text-right border-r border-black w-1/3 font-bold">{formatCurrency(reportData.summary.totalLedgerDebit)}</td>
                      <td rowSpan="2" className="p-2 text-center w-1/3">
                        <div className="font-semibold text-xs uppercase">Closing Balance</div>
                        <div className="text-lg font-bold mt-1">{formatCurrency(closingBalance)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold border-r border-black">Total Credit (Cash Out):</td>
                      <td className="p-2 text-right border-r border-black font-bold">{formatCurrency(reportData.summary.totalLedgerCredit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 1. SCREEN LEDGER TABLE (Supports Descending / Ascending) */}
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden print:hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Cash Ledger Transactions</h3>
                  <span className="text-xs font-medium text-slate-500">
                    Sort: <span className="font-bold text-slate-700">{sortOrder === 'desc' ? 'Descending (Newest First)' : 'Ascending (Oldest First)'}</span>
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 w-12">S.No</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 w-24">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600">Account Title</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600">Description</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600">Bill</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 w-28">Debit (Dr)</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 w-28">Credit (Cr)</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider w-28">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Opening Balance Row at top for Ascending */}
                    {sortOrder === 'asc' && reportData.ledgerEntries.length > 0 && (
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2.5 text-slate-500 border-r border-slate-200 text-xs">—</td>
                        <td className="px-3 py-2.5 text-slate-700 border-r border-slate-200 whitespace-nowrap text-xs">{formatDate(startDate)}</td>
                        <td className="px-3 py-2.5 text-slate-700 border-r border-slate-200" colSpan={3}>
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Balance b/f (Opening Balance)</span>
                        </td>
                        <td className="px-3 py-2.5 text-right border-r border-slate-200 text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right border-r border-slate-200 text-slate-400">—</td>
                        <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${openingBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(openingBalance)}
                        </td>
                      </tr>
                    )}

                    {screenEntries.map((entry, index) => {
                      const displayAmts = getLedgerEntryDisplayAmounts(entry);
                      const balance = parseFloat(entry.closing_balance || 0);
                      const sno = sortOrder === 'desc' ? reportData.ledgerEntries.length - index : index + 1;
                      return (
                        <tr key={entry.l_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ledger-row-hover cursor-pointer`}>
                          <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200">{sno}</td>
                          <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                          <td className="px-3 py-2.5 text-slate-900 font-medium border-r border-slate-200">{entry.customer?.cus_name || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-600 border-r border-slate-200">{entry.details || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200">
                            {entry.bill_no ? `Bill: ${entry.bill_no}` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right border-r border-slate-200 tabular-nums">
                            {displayAmts.debit > 0 ? <span className="text-green-600">{formatCurrency(displayAmts.debit)}</span> : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right border-r border-slate-200 tabular-nums">
                            {displayAmts.credit > 0 ? <span className="text-red-600">{formatCurrency(displayAmts.credit)}</span> : '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(balance)}</td>
                        </tr>
                      );
                    })}

                    {/* Opening Balance Row at bottom for Descending */}
                    {sortOrder === 'desc' && reportData.ledgerEntries.length > 0 && (
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2.5 text-slate-500 border-r border-slate-200 text-xs">—</td>
                        <td className="px-3 py-2.5 text-slate-700 border-r border-slate-200 whitespace-nowrap text-xs">{formatDate(startDate)}</td>
                        <td className="px-3 py-2.5 text-slate-700 border-r border-slate-200" colSpan={3}>
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Balance b/f (Opening Balance)</span>
                        </td>
                        <td className="px-3 py-2.5 text-right border-r border-slate-200 text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right border-r border-slate-200 text-slate-400">—</td>
                        <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${openingBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(openingBalance)}
                        </td>
                      </tr>
                    )}

                    {reportData.ledgerEntries.length === 0 && (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No cash transactions found for the selected period</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold">
                      <td colSpan="5" className="px-3 py-3 text-right uppercase text-xs tracking-wider border-r border-slate-600">Grand Total</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 tabular-nums">{formatCurrency(reportData.summary.totalLedgerDebit)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 tabular-nums">{formatCurrency(reportData.summary.totalLedgerCredit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(closingBalance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 2. PRINT LEDGER TABLE (ALWAYS ASCENDING CHRONOLOGICAL ORDER) */}
              <div className="hidden print:block bg-white border border-black">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200 text-black">
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider border-r border-black w-12">S.No</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider border-r border-black w-24">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider border-r border-black">Account Title</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider border-r border-black">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider border-r border-black">Bill</th>
                      <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider border-r border-black w-28">Debit (Dr)</th>
                      <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider border-r border-black w-28">Credit (Cr)</th>
                      <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider w-28">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {/* Opening Balance Row at Top for Print */}
                    {reportData.ledgerEntries.length > 0 && (
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2 text-gray-700 border-r border-black text-xs">—</td>
                        <td className="px-3 py-2 text-gray-700 border-r border-black whitespace-nowrap text-xs">{formatDate(startDate)}</td>
                        <td className="px-3 py-2 text-gray-700 border-r border-black" colSpan={3}>
                          <span className="text-xs font-bold uppercase tracking-wide">Balance b/f (Opening Balance)</span>
                        </td>
                        <td className="px-3 py-2 text-right border-r border-black text-gray-500">—</td>
                        <td className="px-3 py-2 text-right border-r border-black text-gray-500">—</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">
                          {formatCurrency(openingBalance)}
                        </td>
                      </tr>
                    )}

                    {/* Always Ascending Chronological List for Print */}
                    {reportData.ledgerEntries.map((entry, index) => {
                      const displayAmts = getLedgerEntryDisplayAmounts(entry);
                      const balance = parseFloat(entry.closing_balance || 0);
                      return (
                        <tr key={entry.l_id} className="bg-white">
                          <td className="px-3 py-2 text-black border-r border-black">{index + 1}</td>
                          <td className="px-3 py-2 text-black border-r border-black whitespace-nowrap">{formatDate(entry.created_at)}</td>
                          <td className="px-3 py-2 text-black font-medium border-r border-black">{entry.customer?.cus_name || '-'}</td>
                          <td className="px-3 py-2 text-black border-r border-black">{entry.details || '-'}</td>
                          <td className="px-3 py-2 text-black border-r border-black">{entry.bill_no ? `Bill: ${entry.bill_no}` : '-'}</td>
                          <td className="px-3 py-2 text-right border-r border-black tabular-nums">{displayAmts.debit > 0 ? formatCurrency(displayAmts.debit) : '-'}</td>
                          <td className="px-3 py-2 text-right border-r border-black tabular-nums">{displayAmts.credit > 0 ? formatCurrency(displayAmts.credit) : '-'}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(balance)}</td>
                        </tr>
                      );
                    })}

                    {reportData.ledgerEntries.length === 0 && (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No cash transactions found for the selected period</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 text-black font-bold">
                      <td colSpan="5" className="px-3 py-2 text-right uppercase text-xs tracking-wider border-r border-black">Grand Total</td>
                      <td className="px-3 py-2 text-right border-r border-black tabular-nums">{formatCurrency(reportData.summary.totalLedgerDebit)}</td>
                      <td className="px-3 py-2 text-right border-r border-black tabular-nums">{formatCurrency(reportData.summary.totalLedgerCredit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(closingBalance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Print Footer */}
              <div className="hidden print:flex justify-between items-center mt-6 pt-4 border-t-2 border-black text-xs">
                <span>Generated: {new Date().toLocaleString('en-GB')}</span>
                <span className="font-semibold">Ittefaq Management System</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center print:hidden">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Report Generated</h3>
              <p className="text-slate-500 mt-1">Select date range and click Generate Report to view data</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .no-print { display: none !important; }
          body { font-size: 10px !important; background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; font-size: 9px !important; }
          th, td { padding: 4px 6px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          th { position: static !important; }
          tr { page-break-inside: avoid !important; }
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
