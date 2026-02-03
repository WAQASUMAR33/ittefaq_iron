'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Search, FileText, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';

export default function PurchaseReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

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
      const response = await fetch(`/api/customers?category=${categoryId}`);
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
    if (!startDate || !endDate) { alert('Please select date range'); return; }
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=purchase-report&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (response.ok) {
        let filteredData = { ...data };
        if (selectedCategory) {
          filteredData.purchases = data.purchases.filter(p => p.customer?.customer_category?.cus_cat_id === parseInt(selectedCategory));
        }
        if (selectedAccount) {
          filteredData.purchases = filteredData.purchases.filter(p => p.customer?.cus_id === parseInt(selectedAccount));
        }
        filteredData.summary = {
          totalPurchases: filteredData.purchases.length,
          totalAmount: filteredData.purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0),
          totalUnloading: filteredData.purchases.reduce((sum, p) => sum + parseFloat(p.unloading_amount || 0), 0),
          totalFare: filteredData.purchases.reduce((sum, p) => sum + parseFloat(p.fare_amount || 0), 0),
          totalDiscount: filteredData.purchases.reduce((sum, p) => sum + parseFloat(p.discount || 0), 0),
          netTotal: filteredData.purchases.reduce((sum, p) => sum + parseFloat(p.net_total || 0), 0),
          totalPaid: filteredData.purchases.reduce((sum, p) => sum + parseFloat(p.payment || 0), 0)
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
    let csv = 'PURCHASE REGISTER\n';
    csv += `Period: ${formatDate(startDate)} to ${formatDate(endDate)}\n\n`;
    csv += 'S.No,Date,Voucher No,Party Name,Gross Amount,Unloading,Fare,Discount,Net Amount,Paid,Balance\n';
    reportData.purchases.forEach((p, i) => {
      const balance = parseFloat(p.net_total || 0) - parseFloat(p.payment || 0);
      csv += `${i+1},${formatDate(p.created_at)},PUR-${p.pur_id},${p.customer?.cus_name || '-'},${formatCurrency(p.total_amount)},${formatCurrency(p.unloading_amount)},${formatCurrency(p.fare_amount)},${formatCurrency(p.discount)},${formatCurrency(p.net_total)},${formatCurrency(p.payment)},${formatCurrency(balance)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-register-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white print:bg-white overflow-hidden">
        {/* Screen Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Purchase Register</h1>
                  <p className="text-slate-300 text-sm">Supplier-wise purchase transactions</p>
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">TO DATE</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">CATEGORY</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Categories</option>
                {categories.map((cat) => (<option key={cat.cus_cat_id} value={cat.cus_cat_id}>{cat.cus_cat_title}</option>))}
              </select>
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">PARTY</label>
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} disabled={!selectedCategory}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed">
                <option value="">All Parties</option>
                {accounts.map((acc) => (<option key={acc.cus_id} value={acc.cus_id}>{acc.cus_name}</option>))}
              </select>
            </div>
            <button onClick={fetchReport} disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors min-w-[140px]">
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
                    <h2 className="text-lg font-bold tracking-widest">PURCHASE REGISTER</h2>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Period:</span> {formatDate(startDate)} to {formatDate(endDate)}
                    {selectedCategory && categories.find(c => c.cus_cat_id === parseInt(selectedCategory)) && 
                      <span className="ml-4"><span className="font-semibold">Category:</span> {categories.find(c => c.cus_cat_id === parseInt(selectedCategory))?.cus_cat_title}</span>}
                  </p>
                </div>
              </div>

              {/* Summary Cards - Screen Only */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 print:hidden">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Purchases</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{reportData.summary.totalPurchases}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Gross Amount</p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">Rs. {formatCurrency(reportData.summary.totalAmount)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Amount Paid</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">Rs. {formatCurrency(reportData.summary.totalPaid)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Balance Due</p>
                  <p className="text-2xl font-bold text-amber-800 mt-1">Rs. {formatCurrency(reportData.summary.netTotal - reportData.summary.totalPaid)}</p>
                </div>
              </div>

              {/* Print Summary */}
              <div className="hidden print:block mb-4 border border-black">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold border-r border-black">Total Purchases:</td>
                      <td className="p-2 text-right border-r border-black">{reportData.summary.totalPurchases}</td>
                      <td className="p-2 font-semibold border-r border-black">Gross Amount:</td>
                      <td className="p-2 text-right">{formatCurrency(reportData.summary.totalAmount)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold border-r border-black">Unloading:</td>
                      <td className="p-2 text-right border-r border-black">{formatCurrency(reportData.summary.totalUnloading)}</td>
                      <td className="p-2 font-semibold border-r border-black">Fare/Freight:</td>
                      <td className="p-2 text-right">{formatCurrency(reportData.summary.totalFare)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold border-r border-black">Total Discount:</td>
                      <td className="p-2 text-right border-r border-black">{formatCurrency(reportData.summary.totalDiscount)}</td>
                      <td className="p-2 font-semibold border-r border-black">Net Amount:</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(reportData.summary.netTotal)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold border-r border-black">Amount Paid:</td>
                      <td className="p-2 text-right border-r border-black">{formatCurrency(reportData.summary.totalPaid)}</td>
                      <td className="p-2 font-semibold border-r border-black">Balance Due:</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(reportData.summary.netTotal - reportData.summary.totalPaid)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Main Table */}
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden print:border-black print:rounded-none">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white print:bg-gray-200 print:text-black">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">S.No</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Vch No</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Party Name</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Gross Amt</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Unload</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Fare</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Disc</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Net Amt</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Paid</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-black">
                    {reportData.purchases.map((purchase, index) => {
                      const balance = parseFloat(purchase.net_total || 0) - parseFloat(purchase.payment || 0);
                      return (
                        <tr key={purchase.pur_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 print:bg-white transition-colors`}>
                          <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black">{index + 1}</td>
                          <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black whitespace-nowrap">{formatDate(purchase.created_at)}</td>
                          <td className="px-3 py-2.5 text-slate-600 border-r border-slate-200 print:border-black font-mono text-xs">PUR-{purchase.pur_id}</td>
                          <td className="px-3 py-2.5 text-slate-900 font-medium border-r border-slate-200 print:border-black">{purchase.customer?.cus_name || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(purchase.total_amount)}</td>
                          <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(purchase.unloading_amount)}</td>
                          <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(purchase.fare_amount)}</td>
                          <td className="px-3 py-2.5 text-slate-900 text-right border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(purchase.discount)}</td>
                          <td className="px-3 py-2.5 text-slate-900 text-right font-semibold border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(purchase.net_total)}</td>
                          <td className="px-3 py-2.5 text-emerald-700 text-right border-r border-slate-200 print:border-black print:text-black tabular-nums">{formatCurrency(purchase.payment)}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${balance > 0 ? 'text-red-600 print:text-black' : 'text-slate-900'}`}>{formatCurrency(balance)}</td>
                        </tr>
                      );
                    })}
                    {reportData.purchases.length === 0 && (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-slate-500">No purchase transactions found for the selected period</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold print:bg-gray-200 print:text-black">
                      <td colSpan="4" className="px-3 py-3 text-right uppercase text-xs tracking-wider border-r border-slate-600 print:border-black">Grand Total</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalAmount)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalUnloading)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalFare)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalDiscount)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.netTotal)}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatCurrency(reportData.summary.totalPaid)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(reportData.summary.netTotal - reportData.summary.totalPaid)}</td>
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
