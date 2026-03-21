'use client';

import { useState, useEffect } from 'react';
import {
    Download,
    Printer,
    ArrowLeft,
    ShoppingBag,
    Search,
    Filter,
    Plus,
    X,
    Save
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';

export default function RebateReport() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');

    // Rebate Dialog State
    const [isRebateOpen, setIsRebateOpen] = useState(false);
    const [rebateRate, setRebateRate] = useState('');
    const [savingRebate, setSavingRebate] = useState(false);

    // Set default dates and fetch suppliers
    useEffect(() => {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);

        setStartDate(oneMonthAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        fetchSuppliers();
    }, []);

    // Auto-fetch report when filters change
    useEffect(() => {
        if (selectedSupplierId && startDate && endDate) {
            fetchReport();
        } else {
            setReportData(null);
        }
    }, [selectedSupplierId, startDate, endDate]);

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/customers');
            const data = await response.json();
            if (response.ok) {
                setSuppliers(data);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchReport = async () => {
        if (!selectedSupplierId || !startDate || !endDate) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/reports?type=rebate-report&supplierId=${selectedSupplierId}&startDate=${startDate}&endDate=${endDate}`);
            const data = await response.json();

            if (response.ok) {
                setReportData(data);
            } else {
                alert(data.error || 'Error fetching report');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error fetching report');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRebate = async () => {
        if (!reportData || !rebateRate) return;

        const totalQty = reportData.summary.totalQuantity;
        const rate = parseFloat(rebateRate) || 0;
        const totalAmount = Number((totalQty * rate).toFixed(2));

        if (totalAmount <= 0) {
            alert('Please enter a valid rate');
            return;
        }

        try {
            setSavingRebate(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const ledgerEntry = {
                cus_id: parseInt(selectedSupplierId),
                credit_amount: totalAmount,
                debit_amount: 0,
                trnx_type: 'CASH', // User requested cash column
                details: `Rebate From: ${startDate} To: ${endDate} | Qty: ${totalQty.toFixed(2)} | Rate: ${rate.toFixed(2)}`,
                updated_by: user?.user_id ? parseInt(user.user_id) : (user?.id ? parseInt(user.id) : null)
            };

            const response = await fetch('/api/ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ledgerEntry)
            });

            if (response.ok) {
                alert('Rebate saved successfully to supplier ledger!');
                setIsRebateOpen(false);
                setRebateRate('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error saving rebate:', error);
            alert('Failed to save rebate');
        } finally {
            setSavingRebate(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        if (!reportData) return;

        let csv = 'Ittefaq Iron and Cement Store\\n';
        csv += 'Rebate Report\\n';
        csv += `Supplier: ${reportData.summary.supplierName}\\n`;
        csv += `From: ${startDate} To: ${endDate}\\n\\n`;
        csv += 'Product,Purchases,Unit,Total Quantity,Total Amount,Avg Rate\\n';

        reportData.products.forEach(p => {
            csv += `"${p.pro_title}",${p.purchase_count},${p.unit},${p.total_quantity.toFixed(2)},${p.total_amount.toFixed(2)},${p.avg_rate.toFixed(2)}\\n`;
        });

        csv += '\\n';
        csv += `TOTAL,,${reportData.summary.productCount} Products,${reportData.summary.totalQuantity.toFixed(2)},${reportData.summary.totalAmount.toFixed(2)},\\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rebate-report-${reportData.summary.supplierName}-${startDate}-to-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const rebateTotalAmount = reportData ? Number((reportData.summary.totalQuantity * (parseFloat(rebateRate) || 0)).toFixed(2)) : 0;

    return (
        <DashboardLayout>
            <div id="printable-report" className="h-full flex flex-col overflow-hidden print:overflow-visible">
                {/* Header */}
                <div className="flex-shrink-0 mb-6 print:hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/dashboard/reports')}
                                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Rebate Report</h2>
                                <p className="text-gray-600 mt-1">View products purchased from a specific supplier</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex-shrink-0 mb-6 print:hidden">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier</label>
                                <select
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm"
                                >
                                    <option value="">Choose a supplier...</option>
                                    {suppliers
                                        .filter(s => s.customer_category?.cus_cat_title?.toLowerCase().includes('supplier'))
                                        .map((s) => (
                                            <option key={s.cus_id} value={s.cus_id}>
                                                {s.cus_name} ({s.customer_category?.cus_cat_title})
                                            </option>
                                        ))}
                                    {/* Fallback: show all if no 'supplier' category items found */}
                                    {suppliers.filter(s => s.customer_category?.cus_cat_title?.toLowerCase().includes('supplier')).length === 0 &&
                                        suppliers.map((s) => (
                                            <option key={s.cus_id} value={s.cus_id}>
                                                {s.cus_name} ({s.customer_category?.cus_cat_title || 'No Category'})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                {reportData && (
                    <>
                        {/* Action Buttons */}
                        <div className="flex-shrink-0 mb-4 print:hidden">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setIsRebateOpen(true)}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Rebate
                                </button>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-sm"
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Print Header */}
                        <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-4 text-center">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ittefaq Iron and Cement Store</h1>
                            <p className="text-gray-700">Parianwali | +92 346 7560306</p>
                            <div className="mt-4">
                                <h2 className="text-xl font-semibold text-gray-800 underline">REBATE REPORT</h2>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span>Supplier: <strong>{reportData.summary.supplierName}</strong></span>
                                    <span>Period: {startDate} to {endDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-200/50 mb-6">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchases</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Quantity</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.products.map((p) => (
                                        <tr key={p.pro_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.pro_title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{p.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{p.purchase_count}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">{p.total_quantity.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{p.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{p.avg_rate.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                    <tr className="font-bold">
                                        <td colSpan={3} className="px-6 py-4 text-right text-sm text-gray-900 uppercase">Grand Total:</td>
                                        <td className="px-6 py-4 text-right text-sm text-blue-700 underline decoration-double">{reportData.summary.totalQuantity.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-900">{reportData.summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Pagination/Summary Info */}
                        <div className="flex-shrink-0 bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100 flex justify-between items-center print:hidden">
                            <div className="text-blue-800 text-sm font-medium">
                                Showing summary for {reportData.summary.productCount} products across {reportData.summary.purchaseCount} purchases.
                            </div>
                            <div className="text-xl font-bold text-blue-900">
                                Total Quantity: {reportData.summary.totalQuantity.toFixed(2)}
                            </div>
                        </div>
                    </>
                )}

                {/* Rebate Modal */}
                {isRebateOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            {/* Modal Header */}
                            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
                                <div className="flex items-center space-x-2">
                                    <Plus className="w-5 h-5" />
                                    <h3 className="text-lg font-bold">Add Rebate to Ledger</h3>
                                </div>
                                <button onClick={() => setIsRebateOpen(false)} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supplier Account</label>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold shadow-inner">
                                            {reportData.summary.supplierName}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Quantity (Aggregated)</label>
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-blue-900 font-bold text-lg shadow-inner">
                                            {reportData.summary.totalQuantity.toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rebate Rate (Per Unit)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={rebateRate}
                                                onChange={(e) => setRebateRate(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && rebateRate && parseFloat(rebateRate) > 0) {
                                                        handleSaveRebate();
                                                    }
                                                }}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-lg"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Rebate Amount</label>
                                            <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 font-bold text-lg shadow-inner">
                                                {rebateTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleSaveRebate}
                                        disabled={savingRebate || !rebateRate || parseFloat(rebateRate) <= 0}
                                        className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-indigo-700 transition-all duration-200 font-bold shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2 group"
                                    >
                                        {savingRebate ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                <span>Save to Ledger</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!reportData && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Filter className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900">No Data to Display</h3>
                        <p className="text-gray-500 mt-2 max-w-sm text-center">
                            Select a supplier and date range, then click <strong>Filter Report</strong> to see the products purchased.
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
