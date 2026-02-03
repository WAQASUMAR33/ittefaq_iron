'use client';

import { useState, useEffect } from 'react';
import { 
  Download,
  Printer,
  ArrowLeft,
  FileText,
  Search,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';

export default function CustomerLedgerReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_phone_no?.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.cus_name);
    setShowCustomerDropdown(false);
  };

  const fetchReport = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=customer-ledger&customerId=${selectedCustomer.cus_id}&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      
      if (response.ok) {
        setReportData(data);
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
    if (!reportData) return;

    let csv = 'Ittefaq Iron and Cement Store\n';
    csv += 'Address: Parianwali\n';
    csv += 'Phone: +92 346 7560306\n\n';
    csv += 'Customer Ledger Report\n';
    csv += `Customer: ${reportData.customer?.cus_name}\n`;
    csv += `From: ${new Date(startDate).toLocaleDateString()} To: ${new Date(endDate).toLocaleDateString()}\n`;
    csv += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csv += 'Date,Type,Bill No,Details,Debit,Credit,Balance,Payments\n';
    
    reportData.ledgerEntries.forEach(entry => {
      csv += `${new Date(entry.created_at).toLocaleDateString()},${entry.trnx_type},${entry.bill_no || ''},${entry.details || ''},${parseFloat(entry.debit_amount).toFixed(2)},${parseFloat(entry.credit_amount).toFixed(2)},${parseFloat(entry.closing_balance).toFixed(2)},${parseFloat(entry.payments).toFixed(2)}\n`;
    });

    csv += '\n';
    csv += `Opening Balance:,,,${reportData.summary.openingBalance.toFixed(2)}\n`;
    csv += `Total Debit:,,,${reportData.summary.totalDebit.toFixed(2)}\n`;
    csv += `Total Credit:,,,${reportData.summary.totalCredit.toFixed(2)}\n`;
    csv += `Closing Balance:,,,${reportData.summary.closingBalance.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-ledger-${reportData.customer?.cus_name}-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div id="printable-report" className="h-full flex flex-col overflow-hidden print:overflow-visible">
        {/* Header */}
        <div className="flex-shrink-0 mb-6 print:hidden">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard/reports')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Customer Ledger Report</h2>
              <p className="text-gray-600 mt-1">View detailed transaction ledger for a customer</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 mb-6 print:hidden">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) {
                      setSelectedCustomer(null);
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customers..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-11" />
                
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.cus_id}
                          onClick={() => selectCustomer(customer)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.cus_name}</div>
                          <div className="text-sm text-gray-500">{customer.cus_phone_no}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">No customers found</div>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-800">{selectedCustomer.cus_name}</div>
                        <div className="text-sm text-green-600">{selectedCustomer.cus_phone_no}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearchTerm('');
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
            </div>
            <div className="mt-4">
              <button
                onClick={fetchReport}
                disabled={loading || !selectedCustomer}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {reportData && (
          <>
            {/* Print Header */}
            <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Ittefaq Iron and Cement Store</h1>
                <p className="text-gray-700 text-lg">Address: Parianwali</p>
                <p className="text-gray-700 text-lg">Phone: +92 346 7560306</p>
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h2 className="text-2xl font-semibold text-gray-800">Customer Ledger Report</h2>
                  <p className="text-gray-600 mt-2">Customer: {reportData.customer?.cus_name}</p>
                  <p className="text-gray-600">
                    From {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Generated on: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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

            {/* Table */}
            <div className="flex-1 min-h-0 print:min-h-0 print:block">
              <div className="bg-white rounded-lg shadow print:shadow-none print:border print:border-gray-300 h-full flex flex-col print:block">
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Ledger Entries</h3>
                </div>
                
                <div className="flex-1 overflow-auto print:overflow-visible print:block">
                  <table className="min-w-full divide-y divide-gray-200 print:block print:table">
                    <thead className="bg-white border-b-2 border-gray-300 sticky top-0 print:relative">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Bill No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Debit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Credit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 font-bold uppercase tracking-wider">Payments</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.ledgerEntries.map((entry) => (
                        <tr key={entry.l_id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.trnx_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.bill_no?.slice(-8) || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {entry.details || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                            {parseFloat(entry.debit_amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                            {parseFloat(entry.credit_amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                            {parseFloat(entry.closing_balance).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                            {parseFloat(entry.payments).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-900">Opening Balance:</td>
                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-900">
                          {reportData.summary.openingBalance.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-900">Total Debit:</td>
                        <td className="px-6 py-4 text-right text-sm text-green-600">
                          {reportData.summary.totalDebit.toFixed(2)}
                        </td>
                        <td colSpan="3"></td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-900">Total Credit:</td>
                        <td colSpan="1"></td>
                        <td className="px-6 py-4 text-right text-sm text-red-600">
                          {reportData.summary.totalCredit.toFixed(2)}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-900">Closing Balance:</td>
                        <td colSpan="4" className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {reportData.summary.closingBalance.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block mt-8 pt-4 border-t-2 border-gray-800">
              <div className="text-center">
                <p className="text-gray-700 font-semibold">Ittefaq Iron and Cement Store</p>
                <p className="text-gray-600 text-sm">Address: Parianwali | Phone: +92 346 7560306</p>
                <p className="text-gray-500 text-xs mt-2">
                  This is a computer-generated report. No signature required.
                </p>
              </div>
            </div>
          </>
        )}

        {!reportData && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Report Generated</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a customer, date range and click &quot;Generate Report&quot;
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible !important; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:block { display: block !important; visibility: visible !important; }
          .print\\:table { display: table !important; }
          .print\\:hidden { display: none !important; }
          table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </DashboardLayout>
  );
}
