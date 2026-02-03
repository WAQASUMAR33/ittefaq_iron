'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Package,
  ShoppingCart,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  Eye,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function DayEndPage() {
  // State management
  const [dayEndData, setDayEndData] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [summary, setSummary] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  
  // Form states
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // History pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  // Fetch day end data
  const fetchDayEndData = async (date = selectedDate) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/day-end?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setDayEndData(data.dayEnd);
        setTransactions(data.transactions);
        setSummary(data.summary);
        setOpeningCash(data.dayEnd.opening_cash?.toString() || '');
        setClosingCash(data.dayEnd.closing_cash?.toString() || '');
        setNotes(data.dayEnd.notes || '');
      }
    } catch (error) {
      console.error('Error fetching day end data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch balance sheet data
  const fetchBalanceSheet = async (date = selectedDate) => {
    try {
      const response = await fetch(`/api/balance-sheet?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setBalanceSheet(data);
      }
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
    }
  };

  // Fetch history data
  const fetchHistoryData = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...historyFilters
      });
      
      const response = await fetch(`/api/day-end/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
    }
  };

  useEffect(() => {
    fetchDayEndData();
    fetchBalanceSheet();
  }, [selectedDate]);

  useEffect(() => {
    if (showHistory) {
      fetchHistoryData();
    }
  }, [showHistory, currentPage, historyFilters]);

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchDayEndData(date);
  };

  // Handle delete ledger entries
  const handleDeleteLedger = async (type) => {
    const typeNames = {
      purchase: 'PURCHASE',
      order: 'ORDER/SUBSCRIPTION',
      sales: 'SALES',
      all: 'ALL'
    };

    if (window.confirm(`Are you sure you want to delete all ${typeNames[type]} ledger entries? This action cannot be undone.`)) {
      try {
        const response = await fetch('/api/ledger/delete-all', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        });

        if (response.ok) {
          const data = await response.json();
          alert(`✅ ${data.message}\n\nDetails:\n${Object.entries(data.details).map(([k, v]) => `${k}: ${v}`).join('\n')}`);
        } else {
          alert('❌ Failed to delete ledger entries');
        }
      } catch (error) {
        console.error('Error deleting ledger entries:', error);
        alert('❌ Error: ' + error.message);
      }
    }
  };

  // Handle save day end
  const handleSaveDayEnd = async () => {
    try {
      const response = await fetch('/api/day-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_date: selectedDate,
          opening_cash: openingCash,
          closing_cash: closingCash || null,
          notes: notes,
          closed_by: 1 // TODO: Get actual user ID
        })
      });

      if (response.ok) {
        await fetchDayEndData();
        alert('Day end data saved successfully!');
      }
    } catch (error) {
      console.error('Error saving day end:', error);
      alert('Failed to save day end data');
    }
  };

  // Handle close day
  const handleCloseDay = async () => {
    if (!closingCash) {
      alert('Please enter closing cash amount');
      return;
    }

    if (window.confirm('Are you sure you want to close the day? This action cannot be undone.')) {
      try {
        setIsClosing(true);
        const response = await fetch('/api/day-end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_date: selectedDate,
            opening_cash: openingCash,
            closing_cash: closingCash,
            notes: notes,
            closed_by: 1 // TODO: Get actual user ID
          })
        });

        if (response.ok) {
          await fetchDayEndData();
          alert('Day closed successfully!');
        }
      } catch (error) {
        console.error('Error closing day:', error);
        alert('Failed to close day');
      } finally {
        setIsClosing(false);
      }
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Render Day End View
  const renderDayEndView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Day End / Day Close</h2>
              <p className="text-gray-600 mt-1">Manage daily transactions and close business day</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBalanceSheet(!showBalanceSheet)}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 flex items-center"
              >
                <PieChart className="w-4 h-4 mr-2" />
                {showBalanceSheet ? 'Hide Balance Sheet' : 'Balance Sheet'}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showHistory ? 'Current Day' : 'History'}
              </button>
              <div className="relative group">
                <button
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Delete Ledger
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <button
                    onClick={() => handleDeleteLedger('purchase')}
                    className="block w-full text-left px-4 py-2 text-red-700 hover:bg-red-50 first:rounded-t-lg text-sm"
                  >
                    Delete Purchase Entries
                  </button>
                  <button
                    onClick={() => handleDeleteLedger('order')}
                    className="block w-full text-left px-4 py-2 text-red-700 hover:bg-red-50 text-sm border-t border-gray-200"
                  >
                    Delete Order Entries
                  </button>
                  <button
                    onClick={() => handleDeleteLedger('sales')}
                    className="block w-full text-left px-4 py-2 text-red-700 hover:bg-red-50 text-sm border-t border-gray-200"
                  >
                    Delete Sales Entries
                  </button>
                  <button
                    onClick={() => handleDeleteLedger('all')}
                    className="block w-full text-left px-4 py-2 text-red-800 font-bold hover:bg-red-100 last:rounded-b-lg text-sm border-t border-gray-200"
                  >
                    🗑️ Delete ALL Entries
                  </button>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Business Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                {dayEndData?.status === 'CLOSED' ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Day Closed</span>
                  </div>
                ) : (
                  <div className="flex items-center text-orange-600">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-medium">Day Open</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalSales)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalPurchases)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalExpenses)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash in Hand</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.cashInHand)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
          {/* Left Side - Cash Management */}
          <div className="w-full lg:w-1/3 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Cash Management</h3>
              </div>
              
              <div className="flex-1 p-6 space-y-6">
                {/* Opening Cash */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Cash
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    disabled={dayEndData?.status === 'CLOSED'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="0.00"
                  />
                </div>

                {/* Closing Cash */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Cash
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    disabled={dayEndData?.status === 'CLOSED'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="0.00"
                  />
                </div>

                {/* Cash Flow Summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Cash Flow Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Cash:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(openingCash || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Receipts:</span>
                      <span className="font-medium text-green-600">{formatCurrency(summary?.totalReceipts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Payments:</span>
                      <span className="font-medium text-red-600">{formatCurrency(summary?.totalPayments)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-900 font-semibold">Cash in Hand:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(summary?.cashInHand)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={dayEndData?.status === 'CLOSED'}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="Enter any notes for the day..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {dayEndData?.status !== 'CLOSED' && (
                    <>
                      <button
                        onClick={handleSaveDayEnd}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
                      >
                        Save Day End
                      </button>
                      <button
                        onClick={handleCloseDay}
                        disabled={isClosing}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50"
                      >
                        {isClosing ? 'Closing...' : 'Close Day'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Transaction Details */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Daily Transactions</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Sales */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2 text-green-600" />
                      Sales ({transactions?.sales?.length || 0})
                    </h4>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {formatCurrency(summary?.totalSales)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transactions?.sales?.length || 0} transactions
                      </div>
                    </div>
                  </div>

                  {/* Purchases */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-blue-600" />
                      Purchases ({transactions?.purchases?.length || 0})
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {formatCurrency(summary?.totalPurchases)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transactions?.purchases?.length || 0} transactions
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
                      Expenses ({transactions?.expenses?.length || 0})
                    </h4>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600 mb-2">
                        {formatCurrency(summary?.totalExpenses)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transactions?.expenses?.length || 0} transactions
                      </div>
                    </div>
                  </div>

                  {/* Receipts & Payments */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                      Receipts & Payments
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-lg font-bold text-green-600 mb-1">
                          {formatCurrency(summary?.totalReceipts)}
                        </div>
                        <div className="text-sm text-gray-600">Total Receipts</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-lg font-bold text-red-600 mb-1">
                          {formatCurrency(summary?.totalPayments)}
                        </div>
                        <div className="text-sm text-gray-600">Total Payments</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  // Render History View
  const renderHistoryView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Day End History</h2>
              <p className="text-gray-600 mt-1">View historical day end reports and summaries</p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Current Day
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={historyFilters.startDate}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={historyFilters.endDate}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={historyFilters.status}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setCurrentPage(1)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {historyData?.summary && (
          <div className="flex-shrink-0 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Days</p>
                    <p className="text-2xl font-bold text-gray-900">{historyData.summary.totalDays}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(historyData.summary.totalSales)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(historyData.summary.totalPurchases)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(historyData.summary.totalExpenses)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Day End History</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {historyData?.dayEnds?.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No day end records found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters to see more results.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {historyData?.dayEnds?.map((dayEnd) => (
                    <div key={dayEnd.day_end_id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="text-lg font-semibold text-gray-900">
                              {formatDate(dayEnd.business_date)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {dayEnd._count.day_end_details} transactions
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            dayEnd.status === 'CLOSED' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {dayEnd.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(dayEnd.total_sales)}
                          </div>
                          <div className="text-sm text-gray-500">Total Sales</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {historyData?.pagination && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((historyData.pagination.page - 1) * historyData.pagination.limit) + 1} to{' '}
                    {Math.min(historyData.pagination.page * historyData.pagination.limit, historyData.pagination.totalCount)} of{' '}
                    {historyData.pagination.totalCount} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!historyData.pagination.hasPrev}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">
                      Page {historyData.pagination.page} of {historyData.pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!historyData.pagination.hasNext}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Balance Sheet Section */}
        {showBalanceSheet && balanceSheet && (
          <div className="flex-1 min-h-0 mt-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Balance Sheet - {formatDate(selectedDate)}</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Assets */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">ASSETS</h4>
                    
                    {/* Current Assets */}
                    <div className="space-y-3">
                      <h5 className="text-md font-medium text-gray-700">Current Assets</h5>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cash</span>
                          <span className="text-sm font-medium">{formatCurrency(balanceSheet.balanceSheet.assets.currentAssets.cash)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Accounts Receivable</span>
                          <span className="text-sm font-medium">{formatCurrency(balanceSheet.balanceSheet.assets.currentAssets.accountsReceivable)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                          <span className="text-sm font-semibold text-gray-800">Total Current Assets</span>
                          <span className="text-sm font-bold">{formatCurrency(balanceSheet.balanceSheet.assets.currentAssets.total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3">
                      <span className="text-lg font-bold text-gray-900">TOTAL ASSETS</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(balanceSheet.balanceSheet.assets.totalAssets)}</span>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">LIABILITIES & EQUITY</h4>
                    
                    {/* Liabilities */}
                    <div className="space-y-3">
                      <h5 className="text-md font-medium text-gray-700">Liabilities</h5>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Accounts Payable</span>
                          <span className="text-sm font-medium">{formatCurrency(balanceSheet.balanceSheet.liabilities.accountsPayable)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                          <span className="text-sm font-semibold text-gray-800">Total Liabilities</span>
                          <span className="text-sm font-bold">{formatCurrency(balanceSheet.balanceSheet.liabilities.totalLiabilities)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="space-y-3">
                      <h5 className="text-md font-medium text-gray-700">Equity</h5>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Retained Earnings</span>
                          <span className="text-sm font-medium">{formatCurrency(balanceSheet.balanceSheet.equity.retainedEarnings)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                          <span className="text-sm font-semibold text-gray-800">Total Equity</span>
                          <span className="text-sm font-bold">{formatCurrency(balanceSheet.balanceSheet.equity.totalEquity)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3">
                      <span className="text-lg font-bold text-gray-900">TOTAL LIABILITIES & EQUITY</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(balanceSheet.balanceSheet.liabilities.totalLiabilities + balanceSheet.balanceSheet.equity.totalEquity)}</span>
                    </div>
                  </div>
                </div>

                {/* Daily Transaction Summary */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Daily Transaction Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-green-800 mb-2">Sales</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.sales.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.sales.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credit:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.sales.credit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span className="font-medium">{balanceSheet.dailySummary.sales.count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">Purchases</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.purchases.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.purchases.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credit:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.purchases.credit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span className="font-medium">{balanceSheet.dailySummary.purchases.count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-red-800 mb-2">Expenses</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.expenses.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.expenses.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credit:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.expenses.credit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span className="font-medium">{balanceSheet.dailySummary.expenses.count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-purple-800 mb-2">Cash Flow</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Opening:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.cashFlow.opening)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Closing:</span>
                          <span className="font-medium">{formatCurrency(balanceSheet.dailySummary.cashFlow.closing)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net:</span>
                          <span className={`font-medium ${balanceSheet.dailySummary.cashFlow.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(balanceSheet.dailySummary.cashFlow.net)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Journals:</span>
                          <span className="font-medium">{balanceSheet.dailySummary.journals.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Balances */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Balances</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                      {balanceSheet.customers.map((customer) => (
                        <div key={customer.cus_id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h6 className="text-sm font-medium text-gray-900 truncate">{customer.cus_name}</h6>
                              <p className="text-xs text-gray-500">ID: {customer.cus_id}</p>
                            </div>
                            <span className={`text-sm font-bold ml-2 ${
                              customer.cus_balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(customer.cus_balance)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  return showHistory ? renderHistoryView() : renderDayEndView();
}
