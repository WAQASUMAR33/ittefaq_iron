'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Search, Building2, ArrowUpRight, ArrowDownLeft, Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';

export default function BankReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');

  // Set default dates on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const yearAgo = new Date(2000, 0, 1).toISOString().split('T')[0]; // From year 2000
    setStartDate(yearAgo);
    setEndDate(today);
  }, []);

  // Auto-fetch report when dates are set
  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchCategories(); }, []);

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
      const response = await fetch(`/api/customers?category=${categoryId}`);
      const data = await response.json();
      if (response.ok) setAccounts(data);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) { return; }
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=bank-report&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (response.ok) {
        let filteredData = { ...data };
        if (selectedCategory) {
          filteredData.ledgerEntries = data.ledgerEntries.filter(e => e.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
          filteredData.bankSales = data.bankSales.filter(s => s.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
          filteredData.bankPurchases = data.bankPurchases.filter(p => p.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
        }
        if (selectedAccount) {
          filteredData.ledgerEntries = filteredData.ledgerEntries.filter(e => e.customer?.cus_id === parseInt(selectedAccount));
          filteredData.bankSales = filteredData.bankSales.filter(s => s.customer?.cus_id === parseInt(selectedAccount));
          filteredData.bankPurchases = filteredData.bankPurchases.filter(p => p.customer?.cus_id === parseInt(selectedAccount));
        }
        filteredData.summary = {
          ...data.summary,
          totalLedgerEntries: filteredData.ledgerEntries.length,
          totalLedgerDebit: filteredData.ledgerEntries.reduce((sum, l) => sum + parseFloat(l.debit_amount || 0), 0),
          totalLedgerCredit: filteredData.ledgerEntries.reduce((sum, l) => sum + parseFloat(l.credit_amount || 0), 0),
          totalBankSales: filteredData.bankSales.reduce((sum, s) => sum + parseFloat(s.payment || 0), 0),
          totalBankPurchases: filteredData.bankPurchases.reduce((sum, p) => sum + parseFloat(p.payment || 0), 0),
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
    let csv = 'BANK BOOK\n';
    csv += `Period: ${formatDate(startDate)} to ${formatDate(endDate)}\n\n`;
    csv += 'BANK LEDGER ENTRIES\n';
    csv += 'S.No,Date,Account,Description,Withdrawal,Deposit,Balance\n';
    reportData.ledgerEntries.forEach((e, i) => {
      csv += `${i + 1},${formatDate(e.created_at)},${e.customer?.cus_name || '-'},${e.details || ''},${formatCurrency(e.debit_amount)},${formatCurrency(e.credit_amount)},${formatCurrency(e.closing_balance)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-book-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const netFlow = reportData ? ((reportData.summary.totalLedgerCredit || 0) + (reportData.summary.totalBankSales || 0) - (reportData.summary.totalLedgerDebit || 0) - (reportData.summary.totalBankPurchases || 0)) : 0;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white print:bg-white overflow-hidden">
        {/* Screen Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-cyan-700 to-cyan-900 text-white px-6 py-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Bank Book</h1>
                  <p className="text-cyan-200 text-sm">Bank transactions ledger</p>
                </div>
              </div>
            </div>
            {reportData && (
              <div className="flex items-center space-x-2">
                <button onClick={handleExport} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">TO DATE</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
            <div className="flex-1 min-w-[200px] max-w-[250px]">
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
            <div className="flex-1 min-w-[200px] max-w-[250px]">
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
            <button onClick={fetchReport} disabled={loading}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg text-sm font-semibold transition-colors min-w-[140px]">
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {reportData ? (
          <div className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible">
            <div className="max-w-[1400px] mx-auto">
              {/* Print Header */}
              <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-wider">ITTEFAQ IRON STORE</h1>
                  <p className="text-sm text-gray-600">Parianwali, Pakistan | Tel: +92 346 7560306</p>
                  <div className="mt-3 py-2 bg-black text-white">
                    <h2 className="text-lg font-bold tracking-widest">BANK BOOK</h2>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Period:</span> {formatDate(startDate)} to {formatDate(endDate)}
                  </p>
                </div>
              </div>

              {/* Summary Cards - Screen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 print:hidden">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Deposits</p>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">Rs. {formatCurrency(reportData.summary.totalLedgerCredit)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Withdrawals</p>
                    <ArrowUpRight className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-red-800 mt-1">Rs. {formatCurrency(reportData.summary.totalLedgerDebit)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Bank Sales</p>
                    <Landmark className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-800 mt-1">Rs. {formatCurrency(reportData.summary.totalBankSales)}</p>
                </div>
                <div className={`bg-gradient-to-br ${netFlow >= 0 ? 'from-cyan-50 to-cyan-100 border-cyan-200' : 'from-orange-50 to-orange-100 border-orange-200'} border rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${netFlow >= 0 ? 'text-cyan-600' : 'text-orange-600'} uppercase tracking-wide`}>Net Bank Flow</p>
                    <Building2 className={`w-4 h-4 ${netFlow >= 0 ? 'text-cyan-500' : 'text-orange-500'}`} />
                  </div>
                  <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-cyan-800' : 'text-orange-800'} mt-1`}>Rs. {formatCurrency(netFlow)}</p>
                </div>
              </div>

              {/* Bank Summary Box - Print */}
              <div className="hidden print:block bg-white border-2 border-black mb-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-400">
                      <td className="px-4 py-2 font-medium border-r border-gray-400">Total Deposits:</td>
                      <td className="px-4 py-2 text-right font-bold border-r border-gray-400">{formatCurrency(reportData.summary.totalLedgerCredit)}</td>
                      <td className="px-4 py-2 font-medium border-r border-gray-400">Bank Sales:</td>
                      <td className="px-4 py-2 text-right font-bold">{formatCurrency(reportData.summary.totalBankSales)}</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="px-4 py-2 font-medium border-r border-gray-400">Total Withdrawals:</td>
                      <td className="px-4 py-2 text-right font-bold border-r border-gray-400">{formatCurrency(reportData.summary.totalLedgerDebit)}</td>
                      <td className="px-4 py-2 font-medium border-r border-gray-400">Bank Purchases:</td>
                      <td className="px-4 py-2 text-right font-bold">{formatCurrency(reportData.summary.totalBankPurchases)}</td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td colSpan="2" className="px-4 py-2 font-bold text-right border-r border-gray-400">Net Bank Flow:</td>
                      <td colSpan="2" className="px-4 py-2 text-right font-bold">{formatCurrency(netFlow)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Ledger Table */}
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden print:border-black print:rounded-none">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 print:bg-white print:border-black">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Bank Ledger Entries</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white print:bg-gray-200 print:text-black">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">S.No</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Account</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Description</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Bill</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Withdrawal</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Deposit</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-black">
                    {reportData.ledgerEntries.map((entry, index) => (
                      <tr key={entry.l_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-cyan-50 print:bg-white transition-colors`}>
                        <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black">{index + 1}</td>
                        <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black whitespace-nowrap">{formatDate(entry.created_at)}</td>
                        <td className="px-3 py-2.5 text-slate-900 font-medium border-r border-slate-200 print:border-black">{entry.customer?.cus_name || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-700 border-r border-slate-200 print:border-black">{entry.details || '-'}</td>
                        {(() => {
                          const firstIndex = reportData.ledgerEntries.findIndex(e => e.bill_no === entry.bill_no && ((e.cus_id || e.customer?.cus_id) === (entry.cus_id || entry.customer?.cus_id)));
                          const isFirstBill = entry.bill_no && firstIndex === index;
                          return (
                            <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black">
                              {entry.bill_no ? (
                                isFirstBill ? (
                                  <div>
                                    Bill: {entry.bill_no}{' '}
                                    {((entry.trnx_type === 'PURCHASE' && parseFloat(entry.debit_amount || 0) > 0) || (/incity \(own\) - (labour|delivery)/i).test(entry.details || '')) ? (
                                      <div className="text-xs text-blue-600 font-bold">— {parseFloat(entry.debit_amount).toFixed(2)}</div>
                                    ) : null}
                                  </div>
                                ) : ('')
                              ) : ('-')}
                            </td>
                          );
                        })()}
                        <td className={`px-3 py-2.5 text-right border-r border-slate-200 print:border-black tabular-nums ${parseFloat(entry.debit_amount) > 0 ? 'text-red-600 font-semibold print:text-black' : 'text-slate-400'}`}>
                          {parseFloat(entry.debit_amount) > 0 ? formatCurrency(entry.debit_amount) : '-'}
                        </td>
                        <td className={`px-3 py-2.5 text-right border-r border-slate-200 print:border-black tabular-nums ${parseFloat(entry.credit_amount) > 0 ? 'text-emerald-600 font-semibold print:text-black' : 'text-slate-400'}`}>
                          {parseFloat(entry.credit_amount) > 0 ? formatCurrency(entry.credit_amount) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(entry.closing_balance)}</td>
                      </tr>
                    ))}
                    {reportData.ledgerEntries.length === 0 && (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">No bank transactions found for the selected period</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold print:bg-gray-200 print:text-black">
                      <td colSpan="4" className="px-3 py-3 text-right uppercase text-xs tracking-wider border-r border-slate-600 print:border-black">Grand Total</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalLedgerDebit)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalLedgerCredit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(netFlow)}</td>
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
