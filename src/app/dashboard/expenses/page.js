'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Eye,
  BarChart3,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  FileText,
  Receipt,
  Tag,
  CreditCard,
  TrendingDown,
  Wallet,
  Banknote
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ExpensesPage() {
  // State management
  const [expenses, setExpenses] = useState([]);
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  const [paymentDialog, setPaymentDialog] = useState({ open: false, expense: null });
  const [paymentData, setPaymentData] = useState({
    paid_from_account_id: '',
    payment_reference: '',
    paymentMethod: 'CASH' // 'CASH' or 'BANK'
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpenseType, setSelectedExpenseType] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form data
  const [formData, setFormData] = useState({
    exp_title: '',
    exp_type: '',
    exp_detail: '',
    exp_amount: ''
  });

  // Expense Type Dialog State
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isSubmittingType, setIsSubmittingType] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesRes, expenseTitlesRes, accountsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/expense-titles'),
        fetch('/api/customers')
      ]);

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
      if (expenseTitlesRes.ok) {
        const expenseTitlesData = await expenseTitlesRes.json();
        setExpenseTitles(expenseTitlesData);
      }
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        // Get all accounts, we will filter them in the dialog based on exact rules
        setPaymentAccounts(accountsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.exp_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.exp_detail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.expense_title?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedExpenseType || expense.exp_type == selectedExpenseType;
    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'paid' && expense.is_paid) ||
      (paymentFilter === 'unpaid' && !expense.is_paid);

    return matchesSearch && matchesType && matchesPayment;
  });

  const sortedExpenses = filteredExpenses.sort((a, b) => {
    let aValue, bValue;

    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'exp_amount') {
      aValue = parseFloat(a.exp_amount);
      bValue = parseFloat(b.exp_amount);
    } else if (sortBy === 'exp_title') {
      aValue = a.exp_title.toLowerCase();
      bValue = b.exp_title.toLowerCase();
    } else {
      aValue = a[sortBy];
      bValue = b[sortBy];
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const finalExpenses = sortedExpenses.map((expense, index) => ({
    ...expense,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalExpenses = expenses.length;
  const paidExpenses = expenses.filter(exp => exp.is_paid).length;
  const unpaidExpenses = expenses.filter(exp => !exp.is_paid).length;
  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.exp_amount), 0);
  const paidExpenseAmount = expenses.filter(exp => exp.is_paid).reduce((sum, expense) => sum + parseFloat(expense.exp_amount), 0);
  const unpaidExpenseAmount = expenses.filter(exp => !exp.is_paid).reduce((sum, expense) => sum + parseFloat(expense.exp_amount), 0);
  const averageExpenseAmount = totalExpenses > 0 ? totalExpenseAmount / totalExpenses : 0;
  const expenseTypesCount = new Set(expenses.map(expense => expense.exp_type)).size;

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validation
      if (!formData.exp_title.trim()) {
        alert('Please enter an expense title');
        return;
      }

      if (!formData.exp_type) {
        alert('Please select an expense type');
        return;
      }

      if (!formData.exp_amount || parseFloat(formData.exp_amount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const url = '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const body = editingExpense
        ? {
          id: editingExpense.exp_id,
          ...formData
        }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingExpense(null);
        setFormData({
          exp_title: '',
          exp_type: '',
          exp_detail: '',
          exp_amount: ''
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      exp_title: expense.exp_title,
      exp_type: expense.exp_type,
      exp_detail: expense.exp_detail || '',
      exp_amount: expense.exp_amount.toString()
    });
    setCurrentView('create');
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(`/api/expenses?id=${expenseId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await fetchData();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete expense');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentData.paid_from_account_id) {
      alert('Please select a payment account');
      return;
    }

    try {
      const response = await fetch('/api/expenses/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: paymentDialog.expense.exp_id,
          paid_from_account_id: paymentData.paid_from_account_id,
          payment_reference: paymentData.payment_reference,
          updated_by: 6 // System Administrator
        })
      });

      if (response.ok) {
        await fetchData();
        setPaymentDialog({ open: false, expense: null });
        setPaymentData({ paid_from_account_id: '', payment_reference: '', paymentMethod: 'CASH' });
        alert('Expense marked as paid successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to mark expense as paid');
      }
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      alert('Failed to mark expense as paid');
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      setIsSubmittingType(true);
      const response = await fetch('/api/expense-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTypeName })
      });
      if (response.ok) {
        const result = await response.json();
        setExpenseTitles(prev => [...prev, result]);
        setFormData(prev => ({ ...prev, exp_type: result.id }));
        setShowTypeDialog(false);
        setNewTypeName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create expense type');
      }
    } catch (error) {
      console.error('Error creating expense type:', error);
      alert('Failed to create expense type');
    } finally {
      setIsSubmittingType(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedExpenseType('');
    setPaymentFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
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

  // Render Expenses List View
  const renderExpensesListView = () => (
    <DashboardLayout>
      {/* Fixed Height Container with Overflow Hidden */}
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
              <p className="text-gray-600 mt-1">Track and manage business expenses</p>
            </div>
            <button
              onClick={() => setCurrentView('create')}
              className="group bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Add New Expense
              </span>
            </button>
          </div>
        </div>

        {/* Fixed Filters Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Expense Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expense Type</label>
                <select
                  value={selectedExpenseType}
                  onChange={(e) => setSelectedExpenseType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black appearance-none"
                >
                  <option value="">All Types</option>
                  {expenseTitles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setPaymentFilter('all')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${paymentFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPaymentFilter('paid')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${paymentFilter === 'paid' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Paid
                  </button>
                  <button
                    onClick={() => setPaymentFilter('unpaid')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${paymentFilter === 'unpaid' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Stats Cards Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Total Expenses Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                <Receipt className="w-16 h-16 text-gray-900" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-500 mb-1">Total Budgeted</p>
                <p className="text-3xl font-black text-gray-900">
                  <span className="text-sm mr-1">Rs.</span>
                  {totalExpenseAmount.toLocaleString()}
                </p>
                <div className="flex items-center mt-4 pt-4 border-t border-gray-50">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold mr-2">
                    {totalExpenses} Items
                  </span>
                  <span className="text-xs text-gray-400">Total volume</span>
                </div>
              </div>
            </div>

            {/* Paid Expenses Card */}
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-l-green-500 border border-gray-100/50 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                <Check className="w-16 h-16 text-green-600" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-green-600 mb-1 font-bold italic underline">Total Paid Amount</p>
                <p className="text-3xl font-black text-green-700">
                  <span className="text-sm mr-1">Rs.</span>
                  {paidExpenseAmount.toLocaleString()}
                </p>
                <div className="flex items-center mt-4 pt-4 border-t border-gray-50">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold mr-2 uppercase tracking-wide">
                    {paidExpenses} Paid
                  </span>
                  <span className="text-xs text-gray-400">Settled expenses</span>
                </div>
              </div>
            </div>

            {/* Unpaid Expenses Card */}
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-l-red-500 border border-gray-100/50 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                <X className="w-16 h-16 text-red-600" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-red-600 mb-1 font-bold italic underline">Outstanding Unpaid</p>
                <p className="text-3xl font-black text-red-700">
                  <span className="text-sm mr-1">Rs.</span>
                  {unpaidExpenseAmount.toLocaleString()}
                </p>
                <div className="flex items-center mt-4 pt-4 border-t border-gray-50">
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold mr-2 uppercase tracking-wide">
                    {unpaidExpenses} Pending
                  </span>
                  <span className="text-xs text-gray-400">Action required</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flexible Table Section - Only This Scrolls */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            {/* Fixed Table Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expenses List</h3>
              <span className="text-sm text-gray-500">
                Showing {finalExpenses.length} of {expenses.length} expenses
              </span>
            </div>

            {finalExpenses.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedExpenseType
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by adding your first expense.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-3">Title</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1">Amount</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-3">Credited From</div>
                    <div className="col-span-1 text-center">Created</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                </div>

                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalExpenses.map((expense) => {
                      return (
                        <div key={expense.exp_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* ID */}
                          <div className="col-span-1 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{expense.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {expense.exp_id.toString().slice(-8)}</div>
                            </div>
                          </div>

                          {/* Title */}
                          <div className="col-span-3 flex items-center min-w-0">
                            <div className="w-full">
                              <div className="text-sm font-medium text-gray-900 truncate" title={expense.exp_title}>{expense.exp_title}</div>
                              {expense.exp_detail && (
                                <div className="text-xs text-gray-500 truncate" title={expense.exp_detail}>{expense.exp_detail}</div>
                              )}
                            </div>
                          </div>

                          {/* Type */}
                          <div className="col-span-1 flex items-center min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{expense.expense_title?.title || 'N/A'}</div>
                          </div>

                          {/* Amount */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm font-bold text-red-600">
                              <span className="text-[10px] mr-0.5 opacity-70">Rs.</span>
                              {parseFloat(expense.exp_amount).toLocaleString()}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="col-span-1 flex items-center">
                            {expense.is_paid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wider">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wider">
                                Unpaid
                              </span>
                            )}
                          </div>

                          {/* Credited From */}
                          <div className="col-span-3 flex items-center min-w-0">
                            {expense.is_paid && expense.paid_from_account ? (
                              <div className="flex items-center w-full">
                                <div className="flex-shrink-0 w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center mr-2 border border-blue-100">
                                  <Banknote className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div className="truncate w-full">
                                  <div className="text-sm font-medium text-gray-900 truncate" title={expense.paid_from_account.cus_name}>
                                    {expense.paid_from_account.cus_name}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-mono">
                                    {expense.payment_date ? new Date(expense.payment_date).toLocaleDateString() : ''}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300 italic">—</span>
                            )}
                          </div>

                          {/* Created */}
                          <div className="col-span-1 flex items-center justify-center">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(expense.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex items-center justify-end">
                            <div className="flex items-center space-x-1">
                              {!expense.is_paid && (
                                <button
                                  onClick={() => setPaymentDialog({ open: true, expense })}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Pay Now"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(expense)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.exp_id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  // Render Expense Create View
  const renderExpenseCreateView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('list')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingExpense ? 'Edit Expense' : 'Create New Expense'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingExpense ? 'Update expense information' : 'Add a new business expense'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            {/* Form Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Expense Details</h3>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Form Fields Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Receipt className="w-5 h-5 mr-2 text-gray-600" />
                    Expense Information
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    {/* Expense Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expense Title *
                      </label>
                      <input
                        type="text"
                        name="exp_title"
                        value={formData.exp_title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-black"
                        placeholder="Enter expense title (e.g., Office Supplies, Travel)"
                      />
                    </div>

                    {/* Expense Type */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Expense Type *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowTypeDialog(true)}
                          className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center bg-red-50 px-2 py-1 rounded-md border border-red-100 transition-colors"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add New Type
                        </button>
                      </div>
                      <select
                        name="exp_type"
                        value={formData.exp_type}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-black"
                      >
                        <option value="">Select expense type</option>
                        {expenseTitles.map((title) => (
                          <option key={title.id} value={title.id}>
                            {title.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Expense Detail */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expense Detail
                      </label>
                      <textarea
                        name="exp_detail"
                        value={formData.exp_detail}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-black"
                        placeholder="Enter additional details about the expense"
                      />
                    </div>

                    {/* Expense Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        name="exp_amount"
                        value={formData.exp_amount}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0.01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-black"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCurrentView('list')}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {editingExpense ? 'Update Expense' : 'Create Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <>
      {currentView === 'list' ? renderExpensesListView() : renderExpenseCreateView()}

      {/* Payment Dialog */}
      {paymentDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Mark Expense as Paid</h3>
              <p className="text-sm text-gray-600 mt-1">
                {paymentDialog.expense?.exp_title}
              </p>
              <p className="text-lg font-semibold text-red-600 mt-2">
                Amount: {fmtAmt(paymentDialog.expense?.exp_amount)}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentData(prev => ({ ...prev, paymentMethod: 'CASH', paid_from_account_id: '' }))}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all ${paymentData.paymentMethod === 'CASH'
                      ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                      : 'border-gray-100 bg-gray-50 text-gray-400 font-medium'
                      }`}
                  >
                    <Banknote className="w-5 h-5 mr-2" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentData(prev => ({ ...prev, paymentMethod: 'BANK', paid_from_account_id: '' }))}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all ${paymentData.paymentMethod === 'BANK'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                      : 'border-gray-100 bg-gray-50 text-gray-400 font-medium'
                      }`}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Bank
                  </button>
                </div>
              </div>

              {/* Payment Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {paymentData.paymentMethod === 'CASH' ? 'Cash Account' : 'Bank Account'} *
                </label>
                <select
                  value={paymentData.paid_from_account_id}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, paid_from_account_id: e.target.value }))}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 transition-all duration-200 text-black font-medium ${paymentData.paymentMethod === 'CASH' ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-blue-500 focus:border-blue-500'
                    }`}
                >
                  <option value="">Select {paymentData.paymentMethod?.toLowerCase()} account</option>
                  {paymentAccounts
                    .filter(account => {
                      const typeTitle = account.customer_type?.cus_type_title?.toLowerCase() || '';
                      const catTitle = account.customer_category?.cus_cat_title?.toLowerCase() || '';

                      if (paymentData.paymentMethod === 'CASH') {
                        // User requested: Type "Cash Account" and Category "Cash Account"
                        return typeTitle.includes('cash') && catTitle.includes('cash');
                      } else {
                        // User requested: Type "Bank Account" and Category "Bank Account"
                        return typeTitle.includes('bank') && catTitle.includes('bank');
                      }
                    })
                    .map((account) => (
                      <option key={account.cus_id} value={account.cus_id}>
                        {account.cus_name} (Balance: Rs. {parseFloat(account.cus_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentData.payment_reference}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_reference: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                  placeholder="e.g., Check #1234, Transfer ID"
                />
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-4">
              <button
                onClick={() => {
                  setPaymentDialog({ open: false, expense: null });
                  setPaymentData({ paid_from_account_id: '', payment_reference: '' });
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsPaid}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Type Dialog */}
      {showTypeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-red-500" />
                Add New Expense Type
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a new category for your expenses
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type Title *
              </label>
              <input
                type="text"
                autoFocus
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateType();
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-black font-medium"
                placeholder="e.g., Electricity, Rent, Salary"
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-4">
              <button
                onClick={() => {
                  setShowTypeDialog(false);
                  setNewTypeName('');
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateType}
                disabled={isSubmittingType || !newTypeName.trim()}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                {isSubmittingType ? 'Saving...' : 'Add Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
