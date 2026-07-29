'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertTriangle,
  Printer,
  ArrowLeft,
  ArrowRight,
  Search,
  BarChart3,
  PieChart,
  RefreshCw,
  Calculator,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Wallet
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function DayEndPage() {
  // Main states
  const [dayEndData, setDayEndData] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [accountBalances, setAccountBalances] = useState(null);
  const [summary, setSummary] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);
  const [showDenominations, setShowDenominations] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [activeTab, setActiveTab] = useState('reconciliation'); // 'reconciliation', 'sales', 'purchases', 'ledger', 'expenses'
  
  // History states
  const [historyData, setHistoryData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  // Form states
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');

  // Search filters inside tabs
  const [searchQuery, setSearchQuery] = useState('');

  // Cash Denomination Calculator
  const [denominations, setDenominations] = useState({
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    coins: 0
  });

  // Calculate total from cash denominations
  const totalDenominationAmount = useMemo(() => {
    return (
      (denominations[5000] || 0) * 5000 +
      (denominations[1000] || 0) * 1000 +
      (denominations[500] || 0) * 500 +
      (denominations[100] || 0) * 100 +
      (denominations[50] || 0) * 50 +
      (denominations[20] || 0) * 20 +
      (denominations[10] || 0) * 10 +
      parseFloat(denominations.coins || 0)
    );
  }, [denominations]);

  // Apply calculated denomination amount to closing cash
  const applyDenominations = () => {
    setClosingCash(totalDenominationAmount.toString());
  };

  // Fetch day end data
  const fetchDayEndData = async (date = selectedDate) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/day-end?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setDayEndData(data.dayEnd);
        setTransactions(data.transactions);
        setAccountBalances(data.accountBalances);
        setSummary(data.summary);
        setOpeningCash(data.summary?.openingCash?.toString() || '0');
        setClosingCash(data.dayEnd.closing_cash !== null ? data.dayEnd.closing_cash?.toString() : '');
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
    fetchDayEndData(selectedDate);
    fetchBalanceSheet(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (showHistory) {
      fetchHistoryData();
    }
  }, [showHistory, currentPage, historyFilters]);

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Save draft day end
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/day-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_date: selectedDate,
          opening_cash: openingCash,
          closing_cash: closingCash !== '' ? closingCash : null,
          notes: notes,
          action: 'SAVE_DRAFT'
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchDayEndData(selectedDate);
        alert('✅ Day End draft saved successfully!');
      } else {
        const error = await response.json();
        alert('❌ Error: ' + (error.error || 'Failed to save day end draft'));
      }
    } catch (error) {
      console.error('Error saving day end:', error);
      alert('❌ Failed to save day end');
    } finally {
      setSaving(false);
    }
  };

  // Close day
  const handleCloseDay = async () => {
    if (closingCash === '' || closingCash === null) {
      alert('Please enter actual physical closing cash amount before closing the day.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/day-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_date: selectedDate,
          opening_cash: openingCash,
          closing_cash: closingCash,
          notes: notes,
          action: 'CLOSE_DAY'
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchDayEndData(selectedDate);
        setShowCloseModal(false);
        if (data.warning) {
          alert(data.warning + '\n\n✅ Business day has been closed successfully.');
        } else {
          alert('✅ Business day closed successfully!');
        }
      } else {
        const error = await response.json();
        alert('❌ Error: ' + (error.error || 'Failed to close day'));
      }
    } catch (error) {
      console.error('Error closing day:', error);
      alert('❌ Failed to close business day');
    } finally {
      setSaving(false);
    }
  };

  // Re-open day
  const handleReopenDay = async () => {
    if (window.confirm('Are you sure you want to RE-OPEN this business day? This will allow edits to day-end figures.')) {
      try {
        setSaving(true);
        const response = await fetch('/api/day-end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_date: selectedDate,
            notes: notes,
            action: 'REOPEN_DAY'
          })
        });

        if (response.ok) {
          await fetchDayEndData(selectedDate);
          alert('🔓 Day reopened successfully.');
        } else {
          const error = await response.json();
          alert('❌ Error: ' + (error.error || 'Failed to reopen day'));
        }
      } catch (error) {
        console.error('Error reopening day:', error);
        alert('❌ Failed to reopen day');
      } finally {
        setSaving(false);
      }
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-PK', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Variance calculation
  const calculatedExpectedCash = summary?.expectedCashInHand || 0;
  const enteredActualCash = closingCash !== '' ? parseFloat(closingCash) : null;
  const cashVariance = enteredActualCash !== null ? (enteredActualCash - calculatedExpectedCash) : 0;

  if (loading && !dayEndData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 font-medium">Loading Day End Data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Render Day End View
  const renderDayEndView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-y-auto space-y-6 pb-12 print:p-0 print:overflow-visible">
        
        {/* Printable Header (Visible only when printing) */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold uppercase">ITTEFAQ BUILDERS & IRON STORE</h1>
          <h2 className="text-lg font-semibold text-gray-700">Daily Business Closure Report</h2>
          <p className="text-sm text-gray-500">Date: {formatDate(selectedDate)} | Status: {dayEndData?.status}</p>
        </div>

        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">Day End / Day Close</h2>
              {dayEndData?.status === 'CLOSED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> CLOSED
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 mr-1" /> OPEN
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Reconcile cash flow, view daily breakdown, and record physical closing cash.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowDenominations(!showDenominations)}
              className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors flex items-center ${
                showDenominations ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Calculator className="w-4 h-4 mr-1.5" />
              Cash Calculator
            </button>

            <button
              onClick={() => setShowBalanceSheet(!showBalanceSheet)}
              className="px-3 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center"
            >
              <PieChart className="w-4 h-4 mr-1.5" />
              {showBalanceSheet ? 'Hide Balance Sheet' : 'Balance Sheet'}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              History
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors flex items-center"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </button>
          </div>
        </div>

        {/* Business Date Picker & Quick Actions Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevDay}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600"
                title="Previous Day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 text-gray-800"
              />

              <button
                onClick={handleNextDay}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600"
                title="Next Day"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={handleToday}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 text-gray-700"
              >
                Today
              </button>

              <button
                onClick={() => fetchDayEndData(selectedDate)}
                className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {dayEndData?.status === 'CLOSED' ? (
                <button
                  onClick={handleReopenDay}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors flex items-center text-sm shadow-sm"
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  Re-open Business Day
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    Save Draft
                  </button>

                  <button
                    onClick={() => setShowCloseModal(true)}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center text-sm shadow-sm"
                  >
                    <Lock className="w-4 h-4 mr-1.5" />
                    Close Business Day
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Physical Cash Denomination Calculator Modal/Drawer */}
        {showDenominations && dayEndData?.status !== 'CLOSED' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 print:hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-indigo-900 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-indigo-600" />
                Physical Cash Denomination Counter
              </h4>
              <button
                onClick={applyDenominations}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
              >
                Apply Total ({formatCurrency(totalDenominationAmount)}) to Closing Cash
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[5000, 1000, 500, 100, 50, 20, 10].map((note) => (
                <div key={note} className="bg-white rounded-xl p-2.5 border border-indigo-100 shadow-xs">
                  <span className="text-xs font-bold text-gray-500 block text-center mb-1">Rs. {note}</span>
                  <input
                    type="number"
                    min="0"
                    value={denominations[note] || ''}
                    onChange={(e) => setDenominations({ ...denominations, [note]: parseInt(e.target.value) || 0 })}
                    className="w-full text-center py-1 px-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <span className="text-xs text-indigo-600 font-semibold block text-center mt-1">
                    = {(denominations[note] || 0) * note}
                  </span>
                </div>
              ))}
              <div className="bg-white rounded-xl p-2.5 border border-indigo-100 shadow-xs">
                <span className="text-xs font-bold text-gray-500 block text-center mb-1">Coins/Others</span>
                <input
                  type="number"
                  min="0"
                  value={denominations.coins || ''}
                  onChange={(e) => setDenominations({ ...denominations, coins: parseFloat(e.target.value) || 0 })}
                  className="w-full text-center py-1 px-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                  placeholder="0"
                />
                <span className="text-xs text-indigo-600 font-semibold block text-center mt-1">
                  = {denominations.coins || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total Cash Accounts & Total Bank Accounts Closing Balances Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Total Cash Accounts Closing Balance Card */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Cash Accounts Closing Balance</p>
                <h3 className="text-2xl font-extrabold mt-1">
                  {formatCurrency(summary?.totalCashAccountsBalance)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-emerald-100 mt-2">
              Combined ledger balance of all physical cash accounts ({accountBalances?.cashAccounts?.length || 0} accounts)
            </p>
          </div>

          {/* Total Bank Accounts Closing Balance Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-100">Total Bank Accounts Closing Balance</p>
                <h3 className="text-2xl font-extrabold mt-1">
                  {formatCurrency(summary?.totalBankAccountsBalance)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Landmark className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-indigo-100 mt-2">
              Combined ledger balance of all bank accounts ({accountBalances?.bankAccounts?.length || 0} bank accounts)
            </p>
          </div>

        </div>

        {/* Financial Daily Flow KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Opening Cash */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Opening Cash</p>
                <div className="mt-1 flex items-baseline">
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    disabled={dayEndData?.status === 'CLOSED'}
                    className="text-2xl font-extrabold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-hidden w-36"
                  />
                  <span className="text-xs text-gray-400 ml-1">PKR</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Auto-filled from previous closed day</p>
          </div>

          {/* Cash Inflow */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-600">Total Cash Inflow</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {formatCurrency(summary?.totalCashInflow)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Sales: {formatCurrency(summary?.cashSales)}</span>
              <span>Receipts: {formatCurrency(summary?.cashReceipts)}</span>
            </div>
          </div>

          {/* Cash Outflow */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-600">Total Cash Outflow</p>
                <p className="text-2xl font-extrabold text-rose-700 mt-1">
                  {formatCurrency(summary?.totalCashOutflow)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Pur: {formatCurrency(summary?.cashPurchases)}</span>
              <span>Exp: {formatCurrency(summary?.cashExpenses)}</span>
              <span>Pay: {formatCurrency(summary?.cashPayments)}</span>
            </div>
          </div>

          {/* Expected Cash in Hand & Actual Closing Cash */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-600">Expected Cash in Hand</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">
                  {formatCurrency(calculatedExpectedCash)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 pt-2 border-t flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">Actual Closing:</span>
              <input
                type="number"
                step="0.01"
                placeholder="Enter physical cash"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                disabled={dayEndData?.status === 'CLOSED'}
                className="w-32 px-2 py-0.5 text-xs text-right font-bold border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

        </div>

        {/* Cash Variance Notification Banner */}
        {enteredActualCash !== null && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            cashVariance === 0 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : cashVariance < 0
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center space-x-3">
              {cashVariance === 0 ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              )}
              <div>
                <h5 className="font-bold text-sm">
                  {cashVariance === 0 ? 'Cash Reconciled Perfectly' : cashVariance < 0 ? 'Cash Shortage Detected' : 'Cash Excess Detected'}
                </h5>
                <p className="text-xs opacity-90">
                  Calculated Expected Cash: {formatCurrency(calculatedExpectedCash)} | Actual Physical Cash: {formatCurrency(enteredActualCash)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold block uppercase">Variance Amount</span>
              <span className="text-lg font-extrabold">
                {cashVariance > 0 ? `+${formatCurrency(cashVariance)}` : formatCurrency(cashVariance)}
              </span>
            </div>
          </div>
        )}

        {/* Main Content Tabs & Tables */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
          
          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 px-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
            <div className="flex space-x-4 overflow-x-auto pb-px">
              {[
                { id: 'reconciliation', label: 'Cash & Bank Summary', icon: DollarSign },
                { id: 'sales', label: `Sales (${transactions?.sales?.length || 0})`, icon: ShoppingCart },
                { id: 'purchases', label: `Purchases (${transactions?.purchases?.length || 0})`, icon: Package },
                { id: 'ledger', label: `Receipts & Payments (${transactions?.ledgerEntries?.length || 0})`, icon: Receipt },
                { id: 'expenses', label: `Expenses (${transactions?.expenses?.length || 0})`, icon: TrendingDown }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-3 px-1 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input for lists */}
            {activeTab !== 'reconciliation' && (
              <div className="relative mb-3 sm:mb-0">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 w-full sm:w-56 text-gray-900"
                />
              </div>
            )}
          </div>

          {/* Tab Body Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            
            {/* TAB 1: RECONCILIATION SUMMARY */}
            {activeTab === 'reconciliation' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Cash Flow Detailed Statement */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                      Cash Reconciliation Statement
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Opening Cash Balance:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(summary?.openingCash)}</span>
                      </div>

                      <div className="pl-3 space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>+ Cash Received from Sales:</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(summary?.cashSales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>+ Cash Received from Customer Vouchers:</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(summary?.cashReceipts)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-200 text-emerald-700 font-bold">
                        <span>Total Cash Inflow:</span>
                        <span>{formatCurrency(summary?.totalCashInflow)}</span>
                      </div>

                      <div className="pl-3 space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>- Cash Paid on Purchases:</span>
                          <span className="font-semibold text-rose-600">{formatCurrency(summary?.cashPurchases)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Cash Paid for Expenses:</span>
                          <span className="font-semibold text-rose-600">{formatCurrency(summary?.cashExpenses)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Cash Paid to Supplier Vouchers:</span>
                          <span className="font-semibold text-rose-600">{formatCurrency(summary?.cashPayments)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-200 text-rose-700 font-bold">
                        <span>Total Cash Outflow:</span>
                        <span>{formatCurrency(summary?.totalCashOutflow)}</span>
                      </div>

                      <div className="flex justify-between py-2 border-t-2 border-gray-300 font-extrabold text-base text-blue-900">
                        <span>Calculated Expected Cash:</span>
                        <span>{formatCurrency(calculatedExpectedCash)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank Movement Summary */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-indigo-600" />
                      Bank Account Movement
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Bank Sales Receipts:</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(summary?.bankSales)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Bank Ledger Receipts:</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(summary?.bankReceipts)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200 text-emerald-700 font-bold">
                        <span>Total Bank Inflow:</span>
                        <span>{formatCurrency(summary?.totalBankInflow)}</span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Bank Purchase Payments:</span>
                        <span className="font-semibold text-rose-600">{formatCurrency(summary?.bankPurchases)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Bank Ledger Payments:</span>
                        <span className="font-semibold text-rose-600">{formatCurrency(summary?.bankPayments)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200 text-rose-700 font-bold">
                        <span>Total Bank Outflow:</span>
                        <span>{formatCurrency(summary?.totalBankOutflow)}</span>
                      </div>

                      <div className="flex justify-between py-2 border-t-2 border-gray-300 font-extrabold text-base text-indigo-900">
                        <span>Net Daily Bank Movement:</span>
                        <span className={summary?.netBankFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatCurrency(summary?.netBankFlow)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Cash Accounts & Bank Accounts Itemized Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  
                  {/* Cash Accounts Breakdown List */}
                  <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-3 mb-3">
                      <h4 className="font-bold text-gray-900 text-sm flex items-center">
                        <Wallet className="w-4 h-4 mr-2 text-emerald-600" />
                        Cash Accounts Balances
                      </h4>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        Total: {formatCurrency(summary?.totalCashAccountsBalance)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {accountBalances?.cashAccounts?.map(acc => (
                        <div key={acc.cus_id} className="flex justify-between items-center text-xs py-1.5 px-3 bg-gray-50 rounded-lg hover:bg-emerald-50/50 transition-colors">
                          <span className="font-medium text-gray-800">{acc.cus_name} (ID: #{acc.cus_id})</span>
                          <span className={`font-bold ${acc.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatCurrency(acc.balance)}
                          </span>
                        </div>
                      ))}
                      {(!accountBalances?.cashAccounts || accountBalances.cashAccounts.length === 0) && (
                        <p className="text-xs text-gray-400 text-center py-4">No cash accounts found</p>
                      )}
                    </div>
                  </div>

                  {/* Bank Accounts Breakdown List */}
                  <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-3 mb-3">
                      <h4 className="font-bold text-gray-900 text-sm flex items-center">
                        <Landmark className="w-4 h-4 mr-2 text-indigo-600" />
                        Bank Accounts Balances
                      </h4>
                      <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                        Total: {formatCurrency(summary?.totalBankAccountsBalance)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {accountBalances?.bankAccounts?.map(acc => (
                        <div key={acc.cus_id} className="flex justify-between items-center text-xs py-1.5 px-3 bg-gray-50 rounded-lg hover:bg-indigo-50/50 transition-colors">
                          <span className="font-medium text-gray-800">{acc.cus_name} (ID: #{acc.cus_id})</span>
                          <span className={`font-bold ${acc.balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                            {formatCurrency(acc.balance)}
                          </span>
                        </div>
                      ))}
                      {(!accountBalances?.bankAccounts || accountBalances.bankAccounts.length === 0) && (
                        <p className="text-xs text-gray-400 text-center py-4">No bank accounts found</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Day Notes & Remarks */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    End of Day Notes / Supervisor Comments:
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={dayEndData?.status === 'CLOSED'}
                    rows={3}
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-gray-900"
                    placeholder="Enter any notes regarding cash variance, uncollected payments, or daily observations..."
                  />
                </div>

              </div>
            )}

            {/* TAB 2: SALES LIST */}
            {activeTab === 'sales' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Payment Type</th>
                      <th className="py-3 px-4 text-right">Net Total</th>
                      <th className="py-3 px-4 text-right">Cash Paid</th>
                      <th className="py-3 px-4 text-right">Bank Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions?.sales
                      ?.filter(s => 
                        (s.bill_number?.toString() || s.sale_id?.toString()).includes(searchQuery) ||
                        (s.customer?.cus_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((sale) => {
                        const netTotal = parseFloat(sale.total_amount || 0) - parseFloat(sale.discount || 0) + parseFloat(sale.shipping_amount || 0);
                        return (
                          <tr key={sale.sale_id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              #{sale.bill_number || sale.sale_id}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-900">
                              {sale.customer?.cus_name || 'Walk-in Customer'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700">
                                {sale.payment_type || 'CASH'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-gray-900">
                              {formatCurrency(netTotal)}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                              {formatCurrency(sale.cash_payment || (sale.payment_type === 'CASH' ? sale.payment : 0))}
                            </td>
                            <td className="py-3 px-4 text-right text-indigo-600 font-semibold">
                              {formatCurrency(sale.bank_payment || (sale.payment_type === 'BANK_TRANSFER' ? sale.payment : 0))}
                            </td>
                          </tr>
                        );
                      })}
                    {(!transactions?.sales || transactions.sales.length === 0) && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                          No sales transactions recorded for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: PURCHASES LIST */}
            {activeTab === 'purchases' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Bill #</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Payment Type</th>
                      <th className="py-3 px-4 text-right">Net Total</th>
                      <th className="py-3 px-4 text-right">Cash Paid</th>
                      <th className="py-3 px-4 text-right">Bank Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions?.purchases
                      ?.filter(p => 
                        (p.invoice_number || p.pur_id?.toString()).toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.customer?.cus_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((pur) => (
                        <tr key={pur.pur_id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            #{pur.invoice_number || pur.pur_id}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {pur.customer?.cus_name || 'Supplier'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700">
                              {pur.payment_type || 'CASH'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {formatCurrency(pur.net_total || pur.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                            {formatCurrency(pur.cash_payment || (pur.payment_type === 'CASH' ? pur.payment : 0))}
                          </td>
                          <td className="py-3 px-4 text-right text-indigo-600 font-semibold">
                            {formatCurrency(pur.bank_payment || (pur.payment_type === 'BANK_TRANSFER' ? pur.payment : 0))}
                          </td>
                        </tr>
                      ))}
                    {(!transactions?.purchases || transactions.purchases.length === 0) && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                          No purchase transactions recorded for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: RECEIPTS & PAYMENTS (LEDGER) */}
            {activeTab === 'ledger' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Voucher ID</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4 text-right">Receipt (Inflow)</th>
                      <th className="py-3 px-4 text-right">Payment (Outflow)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions?.ledgerEntries
                      ?.filter(l => 
                        (l.l_id?.toString()).includes(searchQuery) ||
                        (l.customer?.cus_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (l.details || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((entry) => (
                        <tr key={entry.l_id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            #{entry.l_id}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {entry.customer?.cus_name || 'Account'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700">
                              {entry.trnx_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {entry.details || '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                            {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-600 font-bold">
                            {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                          </td>
                        </tr>
                      ))}
                    {(!transactions?.ledgerEntries || transactions.ledgerEntries.length === 0) && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                          No voucher receipts or payments recorded for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: EXPENSES LIST */}
            {activeTab === 'expenses' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions?.expenses
                      ?.filter(e => 
                        (e.exp_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (e.expense_title?.exp_title_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((exp) => (
                        <tr key={exp.exp_id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            #{exp.exp_id}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {exp.exp_title || exp.expense_title?.exp_title_name || 'Expense'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            {formatCurrency(exp.exp_amount)}
                          </td>
                        </tr>
                      ))}
                    {(!transactions?.expenses || transactions.expenses.length === 0) && (
                      <tr>
                        <td colSpan="3" className="text-center py-8 text-gray-400">
                          No expenses recorded for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

        {/* Balance Sheet Drawer Section */}
        {showBalanceSheet && balanceSheet && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 print:hidden">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-6">
              Balance Sheet Overview - {formatDate(selectedDate)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-gray-800 text-sm border-b pb-2 mb-3">ASSETS</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash:</span>
                    <span className="font-semibold">{formatCurrency(balanceSheet.balanceSheet?.assets?.currentAssets?.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accounts Receivable:</span>
                    <span className="font-semibold">{formatCurrency(balanceSheet.balanceSheet?.assets?.currentAssets?.accountsReceivable)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-gray-900">
                    <span>Total Assets:</span>
                    <span>{formatCurrency(balanceSheet.balanceSheet?.assets?.totalAssets)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 text-sm border-b pb-2 mb-3">LIABILITIES & EQUITY</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accounts Payable:</span>
                    <span className="font-semibold">{formatCurrency(balanceSheet.balanceSheet?.liabilities?.accountsPayable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retained Earnings:</span>
                    <span className="font-semibold">{formatCurrency(balanceSheet.balanceSheet?.equity?.retainedEarnings)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-gray-900">
                    <span>Total Liabilities & Equity:</span>
                    <span>{formatCurrency((balanceSheet.balanceSheet?.liabilities?.totalLiabilities || 0) + (balanceSheet.balanceSheet?.equity?.totalEquity || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Signature Block (Only visible when printing) */}
        <div className="hidden print:grid grid-cols-2 gap-8 pt-12 mt-8 border-t">
          <div>
            <p className="text-sm font-bold text-gray-700">Prepared By: ___________________</p>
            <p className="text-xs text-gray-500 mt-1">Cashier Signature</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-700">Verified By: ___________________</p>
            <p className="text-xs text-gray-500 mt-1">Manager / Admin Signature</p>
          </div>
        </div>

      </div>

      {/* CLOSE BUSINESS DAY CONFIRMATION MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-rose-600" />
                Confirm Business Day Closure
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Business Date:</span>
                <span className="font-bold text-gray-900">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Opening Cash:</span>
                <span className="font-semibold">{formatCurrency(summary?.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Cash in Hand:</span>
                <span className="font-bold text-blue-700">{formatCurrency(calculatedExpectedCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entered Physical Closing Cash:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(enteredActualCash || 0)}</span>
              </div>

              <div className={`pt-2 border-t flex justify-between font-extrabold text-sm ${
                cashVariance === 0 ? 'text-emerald-700' : cashVariance < 0 ? 'text-rose-700' : 'text-amber-700'
              }`}>
                <span>Variance (Shortage / Excess):</span>
                <span>{cashVariance > 0 ? `+${formatCurrency(cashVariance)}` : formatCurrency(cashVariance)}</span>
              </div>
            </div>

            {cashVariance !== 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  A cash discrepancy of {formatCurrency(Math.abs(cashVariance))} was detected. Please ensure notes are added below explaining this variance.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Closing Remarks / Audit Notes:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="Closing notes..."
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="w-1/2 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseDay}
                disabled={saving}
                className="w-1/2 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-md flex items-center justify-center"
              >
                {saving ? 'Closing...' : 'Confirm & Close Day'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );

  // Render Day End History View
  const renderHistoryView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Day End History</h2>
            <p className="text-sm text-gray-500 mt-1">Review closed business days and historical reconciliation reports</p>
          </div>
          <button
            onClick={() => setShowHistory(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Current Day
          </button>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={historyFilters.startDate}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={historyFilters.endDate}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
              />
              <select
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-xs font-bold text-gray-700 uppercase border-b">
                <tr>
                  <th className="py-3.5 px-4">Business Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Opening Cash</th>
                  <th className="py-3.5 px-4 text-right">Total Sales</th>
                  <th className="py-3.5 px-4 text-right">Calculated Cash</th>
                  <th className="py-3.5 px-4 text-right">Closing Cash</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyData?.dayEnds?.map((record) => (
                  <tr key={record.day_end_id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatDate(record.business_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        record.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {formatCurrency(record.opening_cash)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(record.total_sales)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-blue-600">
                      {formatCurrency(record.cash_in_hand)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                      {record.closing_cash !== null ? formatCurrency(record.closing_cash) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedDate(new Date(record.business_date).toISOString().split('T')[0]);
                          setShowHistory(false);
                        }}
                        className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {(!historyData?.dayEnds || historyData.dayEnds.length === 0) && (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      No historical day end records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return showHistory ? renderHistoryView() : renderDayEndView();
}
