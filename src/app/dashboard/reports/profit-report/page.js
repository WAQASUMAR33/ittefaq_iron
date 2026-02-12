'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Search, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';

export default function ProfitReport() {
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
      const response = await fetch(`/api/reports?type=profit-report&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (response.ok) {
        let filteredData = { ...data };
        if (selectedCategory) {
          filteredData.sales = data.sales.filter(s => s.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
        }
        if (selectedAccount) {
          filteredData.sales = filteredData.sales.filter(s => s.customer?.cus_id === parseInt(selectedAccount));
        }
        const totalSales = filteredData.sales.reduce((sum, s) => sum + (s.totalSale || 0), 0);
        const totalCost = filteredData.sales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const totalDiscount = filteredData.sales.reduce((sum, s) => sum + parseFloat(s.discount || 0), 0);
        const grossProfit = totalSales - totalCost - totalDiscount;
        const totalExpenses = (data.expenses || []).reduce((sum, e) => sum + parseFloat(e.exp_amount || 0), 0);
        const netProfit = grossProfit - totalExpenses;
        filteredData.summary = {
          totalSales, totalCost, totalDiscount, grossProfit, totalExpenses, netProfit,
          profitMargin: totalSales > 0 ? (grossProfit / totalSales * 100) : 0,
          netProfitMargin: totalSales > 0 ? (netProfit / totalSales * 100) : 0
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
    let csv = 'PROFIT & LOSS STATEMENT\n';
    csv += `Period: ${formatDate(startDate)} to ${formatDate(endDate)}\n\n`;
    csv += 'INCOME STATEMENT\n';
    csv += `Sales Revenue,${formatCurrency(reportData.summary.totalSales)}\n`;
    csv += `Less: Cost of Goods Sold,(${formatCurrency(reportData.summary.totalCost)})\n`;
    csv += `Less: Discounts,(${formatCurrency(reportData.summary.totalDiscount)})\n`;
    csv += `Gross Profit,${formatCurrency(reportData.summary.grossProfit)}\n`;
    csv += `Less: Expenses,(${formatCurrency(reportData.summary.totalExpenses)})\n`;
    csv += `Net Profit,${formatCurrency(reportData.summary.netProfit)}\n\n`;
    csv += 'SALES DETAIL\n';
    csv += 'S.No,Date,Invoice,Customer,Sale Amount,Cost of Goods,Discount,Gross Profit,Margin %\n';
    reportData.sales.forEach((s, i) => {
      csv += `${i + 1},${formatDate(s.created_at)},INV-${s.sale_id},${s.customer?.cus_name || '-'},${formatCurrency(s.totalSale)},${formatCurrency(s.totalCost)},${formatCurrency(s.discount)},${formatCurrency(s.profit)},${(s.profitMargin || 0).toFixed(1)}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white print:bg-white overflow-hidden">
        {/* Screen Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-teal-700 to-teal-900 text-white px-6 py-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Profit & Loss Statement</h1>
                  <p className="text-teal-200 text-sm">Income and expense analysis</p>
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">TO DATE</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
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
              <label className="block text-xs font-semibold text-slate-600 mb-1 caps">CUSTOMER</label>
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
                    placeholder="All Customers"
                    onFocus={(e) => e.target.select()}
                    sx={{
                      '& .MuiOutlinedInput-root': { py: '2px', borderRadius: '8px', bgcolor: selectedCategory ? 'white' : '#f1f5f9' }
                    }}
                  />
                )}
              />
            </div>
            <button onClick={fetchReport} disabled={loading}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-sm font-semibold transition-colors min-w-[140px]">
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
                    <h2 className="text-lg font-bold tracking-widest">PROFIT & LOSS STATEMENT</h2>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Period:</span> {formatDate(startDate)} to {formatDate(endDate)}
                  </p>
                </div>
              </div>

              {/* Summary Cards - Screen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 print:hidden">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Sales Revenue</p>
                    <DollarSign className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-800 mt-1">Rs. {formatCurrency(reportData.summary.totalSales)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Gross Profit</p>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">Rs. {formatCurrency(reportData.summary.grossProfit)}</p>
                </div>
                <div className={`bg-gradient-to-br ${reportData.summary.netProfit >= 0 ? 'from-teal-50 to-teal-100 border-teal-200' : 'from-red-50 to-red-100 border-red-200'} border rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${reportData.summary.netProfit >= 0 ? 'text-teal-600' : 'text-red-600'} uppercase tracking-wide`}>Net Profit</p>
                    {reportData.summary.netProfit >= 0 ? <TrendingUp className="w-4 h-4 text-teal-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                  </div>
                  <p className={`text-2xl font-bold ${reportData.summary.netProfit >= 0 ? 'text-teal-800' : 'text-red-800'} mt-1`}>Rs. {formatCurrency(reportData.summary.netProfit)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Profit Margin</p>
                    <Percent className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-purple-800 mt-1">{(reportData.summary.profitMargin || 0).toFixed(1)}%</p>
                </div>
              </div>

              {/* Income Statement Box */}
              <div className="bg-white border-2 border-slate-300 rounded-lg mb-4 overflow-hidden print:border-black">
                <div className="bg-slate-800 text-white px-4 py-2 print:bg-gray-200 print:text-black">
                  <h3 className="text-sm font-bold uppercase tracking-wide">Income Statement</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-700">Sales Revenue</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(reportData.summary.totalSales)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-700 pl-8">Less: Cost of Goods Sold</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 print:text-black tabular-nums">({formatCurrency(reportData.summary.totalCost)})</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-700 pl-8">Less: Discounts Given</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 print:text-black tabular-nums">({formatCurrency(reportData.summary.totalDiscount)})</td>
                    </tr>
                    <tr className="border-b-2 border-slate-400 bg-slate-100">
                      <td className="px-4 py-3 font-bold text-slate-900">Gross Profit</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(reportData.summary.grossProfit)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-700 pl-8">Less: Operating Expenses</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 print:text-black tabular-nums">({formatCurrency(reportData.summary.totalExpenses)})</td>
                    </tr>
                    <tr className="bg-slate-800 text-white print:bg-gray-200 print:text-black">
                      <td className="px-4 py-3 font-bold">Net Profit / (Loss)</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${reportData.summary.netProfit < 0 ? 'text-red-300 print:text-black' : ''}`}>
                        {reportData.summary.netProfit < 0 ? `(${formatCurrency(Math.abs(reportData.summary.netProfit))})` : formatCurrency(reportData.summary.netProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sales Detail Table */}
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden print:border-black print:rounded-none">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 print:bg-white print:border-black">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Sales Profit Analysis</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white print:bg-gray-200 print:text-black">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">S.No</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Customer</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Sale Amt</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Cost</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Disc</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Profit</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-black">
                    {reportData.sales.map((sale, index) => (
                      <tr key={sale.sale_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-teal-50 print:bg-white transition-colors`}>
                        <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black">{index + 1}</td>
                        <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black whitespace-nowrap">{formatDate(sale.created_at)}</td>
                        <td className="px-3 py-2.5 text-slate-900 font-medium border-r border-slate-200 print:border-black">{sale.customer?.cus_name || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(sale.totalSale)}</td>
                        <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(sale.totalCost)}</td>
                        <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(sale.discount)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold border-r border-slate-200 print:border-black tabular-nums ${(sale.profit || 0) >= 0 ? 'text-emerald-600 print:text-black' : 'text-red-600 print:text-black'}`}>
                          {formatCurrency(sale.profit)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">{(sale.profitMargin || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                    {reportData.sales.length === 0 && (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No sales transactions found for the selected period</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold print:bg-gray-200 print:text-black">
                      <td colSpan="3" className="px-3 py-3 text-right uppercase text-xs tracking-wider border-r border-slate-600 print:border-black">Grand Total</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalSales)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalCost)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalDiscount)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.grossProfit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{(reportData.summary.profitMargin || 0).toFixed(1)}%</td>
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
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </DashboardLayout>
  );
}
