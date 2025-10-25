'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar,
  Download,
  Printer,
  ArrowLeft,
  Search,
  DollarSign,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';

export default function SalesByDateReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=sales-by-date&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      
      if (response.ok) {
        setSalesData(data);
      } else {
        alert('Error fetching report');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error fetching report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!salesData) return;

    // Create CSV content with header
    let csv = ''; 
    csv += 'Itefaq Builders\n';
    csv += 'Address: Parianwali\n';
    csv += 'Phone: +92 346 7560306\n';
    csv += '\n';
    csv += 'Sales Report (By Date)\n';
    csv += `From: ${new Date(startDate).toLocaleDateString()} To: ${new Date(endDate).toLocaleDateString()}\n`;
    csv += `Generated on: ${new Date().toLocaleString()}\n`;
    csv += '\n';
    csv += 'Sale ID,Date,Customer,Items,Total Amount,Discount,Shipping,Net Total,Payment,Bill Type\n';
    
    salesData.sales.forEach(sale => {
      const netTotal = parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0);
      csv += `${sale.sale_id},${new Date(sale.created_at).toLocaleDateString()},${sale.customer?.cus_name || 'N/A'},${sale.sale_details?.length || 0},${parseFloat(sale.total_amount).toFixed(2)},${parseFloat(sale.discount).toFixed(2)},${parseFloat(sale.shipping_amount || 0).toFixed(2)},${netTotal.toFixed(2)},${parseFloat(sale.payment).toFixed(2)},${sale.bill_type}\n`;
    });

    // Add totals
    csv += '\n';
    csv += `TOTAL,,,${salesData.summary.totalSales},${salesData.summary.totalAmount.toFixed(2)},${salesData.summary.totalDiscount.toFixed(2)},${salesData.summary.totalShipping.toFixed(2)},${salesData.summary.netTotal.toFixed(2)},${salesData.summary.totalPayment.toFixed(2)},\n`;

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div id="printable-report" className="h-full flex flex-col overflow-hidden print:overflow-visible">
        {/* Header - Hide on print */}
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
                <h2 className="text-2xl font-bold text-gray-900">Sales Report (By Date)</h2>
                <p className="text-gray-600 mt-1">View sales transactions within a date range</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Hide on print */}
        <div className="flex-shrink-0 mb-6 print:hidden">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range Filter</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {salesData && (
          <>
            {/* Print Header - Only show on print */}
            <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Itefaq Builders</h1>
                <p className="text-gray-700 text-lg">Address: Parianwali</p>
                <p className="text-gray-700 text-lg">Phone: +92 346 7560306</p>
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h2 className="text-2xl font-semibold text-gray-800">Sales Report (By Date)</h2>
                  <p className="text-gray-600 mt-2">
                    From {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Generated on: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons - Hide on print */}
            <div className="flex-shrink-0 mb-4 print:hidden">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleExport}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>
            </div>

            {/* Sales Table */}
            <div className="flex-1 min-h-0 print:min-h-0 print:block">
              <div className="bg-white rounded-lg shadow print:shadow-none print:border print:border-gray-300 h-full flex flex-col print:block">
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Transactions</h3>
                </div>
                
                <div className="flex-1 overflow-auto print:overflow-visible print:block">
                  <table className="min-w-full divide-y divide-gray-200 print:block print:table">
                    <thead className="bg-gray-50 sticky top-0 print:relative">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Total</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salesData.sales.map((sale) => {
                        const netTotal = parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0);
                        return (
                          <tr key={sale.sale_id} className="hover:bg-gray-50 print:hover:bg-white">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.sale_id.toString().slice(-8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.customer?.cus_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                              {sale.sale_details?.length || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {parseFloat(sale.total_amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                              {parseFloat(sale.discount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                              {parseFloat(sale.shipping_amount || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                              {netTotal.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {sale.bill_type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-900">TOTAL:</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {salesData.summary.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                          {salesData.summary.totalDiscount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                          {salesData.summary.totalShipping.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                          {salesData.summary.netTotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Print Footer - Only show on print */}
            <div className="hidden print:block mt-8 pt-4 border-t-2 border-gray-800">
              <div className="text-center">
                <p className="text-gray-700 font-semibold">Itefaq Builders</p>
                <p className="text-gray-600 text-sm">Address: Parianwali | Phone: +92 346 7560306</p>
                <p className="text-gray-500 text-xs mt-2">
                  This is a computer-generated report. No signature required.
                </p>
              </div>
            </div>
          </>
        )}

        {!salesData && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Report Generated</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a date range and click &quot;Generate Report&quot; to view data
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Show the printable report and all its children */
          #printable-report,
          #printable-report * {
            visibility: visible !important;
          }
          
          /* Position printable report at top */
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Show only print content */
          .print\\:block {
            display: block !important;
            visibility: visible !important;
          }
          
          .print\\:block * {
            visibility: visible !important;
          }
          
          .print\\:table {
            display: table !important;
          }
          
          /* Hide non-print elements */
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Table styles for print */
          table {
            page-break-inside: auto;
            border-collapse: collapse;
            width: 100%;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          tbody {
            display: table-row-group;
          }
          
          /* Remove shadows and rounded corners for print */
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border {
            border: 1px solid #e5e7eb !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          /* Ensure backgrounds print */
          .bg-gray-50,
          .bg-blue-100,
          .bg-green-100 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Grid layout for print */
          .print\\:grid {
            display: grid !important;
          }
          
          /* Remove flex on print */
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

