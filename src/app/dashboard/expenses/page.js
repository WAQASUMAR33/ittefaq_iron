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
  TrendingDown
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function ExpensesPage() {
  // State management
  const [expenses, setExpenses] = useState([]);
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpenseType, setSelectedExpenseType] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form data
  const [formData, setFormData] = useState({
    exp_title: '',
    exp_type: '',
    exp_detail: '',
    exp_amount: ''
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesRes, expenseTitlesRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/expense-titles')
      ]);

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
      if (expenseTitlesRes.ok) {
        const expenseTitlesData = await expenseTitlesRes.json();
        setExpenseTitles(expenseTitlesData);
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
    const matchesType = !selectedExpenseType || expense.exp_type === selectedExpenseType;
    
    return matchesSearch && matchesType;
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
  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.exp_amount), 0);
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedExpenseType('');
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
              <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                >
                  <option value="">All Types</option>
                  {expenseTitles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="exp_title-asc">Title A-Z</option>
                  <option value="exp_title-desc">Title Z-A</option>
                  <option value="exp_amount-desc">Amount High-Low</option>
                  <option value="exp_amount-asc">Amount Low-High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Stats Cards Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">{totalExpenses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{totalExpenseAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{averageExpenseAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Expense Types</p>
                  <p className="text-2xl font-bold text-gray-900">{expenseTypesCount}</p>
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
                    <div className="col-span-2">ID</div>
                    <div className="col-span-3">Title</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>
                
                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalExpenses.map((expense) => {
                      return (
                        <div key={expense.exp_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* ID */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{expense.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {expense.exp_id.toString().slice(-8)}</div>
                            </div>
                          </div>

                          {/* Title */}
                          <div className="col-span-3 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{expense.exp_title}</div>
                              {expense.exp_detail && (
                                <div className="text-xs text-gray-500 truncate">{expense.exp_detail}</div>
                              )}
                            </div>
                          </div>

                          {/* Type */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{expense.expense_title?.title || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-semibold text-red-600">{parseFloat(expense.exp_amount).toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Created */}
                          <div className="col-span-2 flex items-center">
                            <div className="text-sm text-gray-900">
                              {new Date(expense.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex items-center">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(expense)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Expense"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.exp_id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Expense"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expense Type *
                      </label>
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
    </>
  );
}
