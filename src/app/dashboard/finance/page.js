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
  Hash,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  CreditCard,
  Banknote
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function FinancePage() {
  // State management
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Customer dropdown filter states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    cus_id: '',
    debit_amount: '',
    credit_amount: '',
    bill_no: '',
    trnx_type: 'CASH',
    details: '',
    payments: ''
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, customersRes] = await Promise.all([
        fetch('/api/ledger'),
        fetch('/api/customers')
      ]);

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setLedgerEntries(ledgerData);
      }
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredLedgerEntries = ledgerEntries.filter(entry => {
    const matchesSearch = entry.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.bill_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || entry.cus_id === selectedCustomer;
    
    return matchesSearch && matchesCustomer;
  });

  // Customer filtering logic
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_phone_no?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_email?.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedLedgerEntries = filteredLedgerEntries.sort((a, b) => {
    let aValue, bValue;
    
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'debit_amount') {
      aValue = parseFloat(a.debit_amount);
      bValue = parseFloat(b.debit_amount);
    } else if (sortBy === 'credit_amount') {
      aValue = parseFloat(a.credit_amount);
      bValue = parseFloat(b.credit_amount);
    } else if (sortBy === 'closing_balance') {
      aValue = parseFloat(a.closing_balance);
      bValue = parseFloat(b.closing_balance);
    } else if (sortBy === 'customer') {
      aValue = a.customer?.cus_name.toLowerCase();
      bValue = b.customer?.cus_name.toLowerCase();
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

  const finalLedgerEntries = sortedLedgerEntries.map((entry, index) => ({
    ...entry,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.debit_amount), 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.credit_amount), 0);
  const totalPayments = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.payments), 0);
  const currentBalance = ledgerEntries.length > 0 ? parseFloat(ledgerEntries[ledgerEntries.length - 1].closing_balance) : 0;

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, cus_id: customer.cus_id }));
    setCustomerSearchTerm(customer.cus_name);
    setShowCustomerDropdown(false);
  };

  const getSelectedCustomer = () => {
    return customers.find(customer => customer.cus_id === formData.cus_id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validation
      if (!formData.cus_id) {
        alert('Please select an account');
        return;
      }
      
      if (!formData.debit_amount && !formData.credit_amount) {
        alert('Please enter either debit or credit amount');
        return;
      }
      
      const url = editingLedger ? '/api/ledger' : '/api/ledger';
      const method = editingLedger ? 'PUT' : 'POST';
      
      const body = editingLedger 
        ? { 
            id: editingLedger.l_id, 
            ...formData
          } 
        : { 
            ...formData
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setShowLedgerForm(false);
        setEditingLedger(null);
        setFormData({
          cus_id: '',
          debit_amount: '',
          credit_amount: '',
          bill_no: '',
          trnx_type: 'CASH',
          details: '',
          payments: ''
        });
      }
    } catch (error) {
      console.error('Error saving ledger entry:', error);
    }
  };

  const handleEdit = (entry) => {
    setEditingLedger(entry);
    setFormData({
      cus_id: entry.cus_id,
      debit_amount: entry.debit_amount.toString(),
      credit_amount: entry.credit_amount.toString(),
      bill_no: entry.bill_no || '',
      trnx_type: entry.trnx_type,
      details: entry.details || '',
      payments: entry.payments.toString()
    });
    setCustomerSearchTerm(entry.customer?.cus_name || '');
    setShowLedgerForm(true);
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this ledger entry?')) {
      try {
        const response = await fetch(`/api/ledger?id=${entryId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting ledger entry:', error);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('');
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

  return (
    <DashboardLayout>
      {/* Fixed Height Container with Overflow Hidden */}
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Finance Management</h2>
              <p className="text-gray-600 mt-1">Manage customer ledger entries, payments, and financial records</p>
            </div>
            <button
              onClick={() => setShowLedgerForm(true)}
              className="group bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Add Ledger Entry
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
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search ledger entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Account Filter */}
              <div className="relative customer-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedCustomer ? customers.find(c => c.cus_id === selectedCustomer)?.cus_name || '' : ''}
                    onChange={(e) => {
                      const searchTerm = e.target.value;
                      if (!searchTerm) {
                        setSelectedCustomer('');
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search accounts..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  
                  {/* Dropdown */}
                  {showCustomerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div
                        onClick={() => {
                          setSelectedCustomer('');
                          setShowCustomerDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      >
                        <div className="font-medium text-gray-900">All Accounts</div>
                      </div>
                      {customers.map((customer) => (
                        <div
                          key={customer.cus_id}
                          onClick={() => {
                            setSelectedCustomer(customer.cus_id);
                            setShowCustomerDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.cus_name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.cus_phone_no} {customer.cus_email && `• ${customer.cus_email}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="customer-asc">Customer A-Z</option>
                  <option value="customer-desc">Customer Z-A</option>
                  <option value="debit_amount-desc">Debit High-Low</option>
                  <option value="credit_amount-desc">Credit High-Low</option>
                  <option value="closing_balance-desc">Balance High-Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Stats Cards Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Debit</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDebit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Credit</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCredit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPayments.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{currentBalance.toLocaleString()}</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Ledger Entries</h3>
              <span className="text-sm text-gray-500">
                Showing {finalLedgerEntries.length} of {ledgerEntries.length} entries
              </span>
            </div>
            
            {finalLedgerEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No ledger entries found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCustomer
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by adding your first ledger entry.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Entry</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-1">Pre Balance</div>
                    <div className="col-span-1">Debit</div>
                    <div className="col-span-1">Credit</div>
                    <div className="col-span-1">Balance</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1">Created</div>
                    <div className="col-span-2">Actions</div>
                  </div>
                </div>
                
                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalLedgerEntries.map((entry) => {
                      return (
                        <div key={entry.l_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* Entry */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Entry #{entry.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {entry.l_id.slice(-8)}</div>
                            </div>
                          </div>

                          {/* Customer */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{entry.customer?.cus_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{entry.customer?.cus_phone_no || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Pre Balance */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm font-medium text-gray-700">
                              {parseFloat(entry.opening_balance).toFixed(2)}
                            </div>
                          </div>

                          {/* Debit */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm font-semibold text-red-600">
                              {parseFloat(entry.debit_amount).toFixed(2)}
                            </div>
                          </div>

                          {/* Credit */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm font-semibold text-green-600">
                              {parseFloat(entry.credit_amount).toFixed(2)}
                            </div>
                          </div>

                          {/* Balance */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {parseFloat(entry.closing_balance).toFixed(2)}
                            </div>
                          </div>

                          {/* Type */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">{entry.trnx_type}</div>
                          </div>

                          {/* Created */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 flex items-center">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Entry"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.l_id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Entry"
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

      {/* Ledger Form Modal */}
      {showLedgerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingLedger ? 'Edit Ledger Entry' : 'Add New Ledger Entry'}
                </h3>
                <button
                  onClick={() => {
                    setShowLedgerForm(false);
                    setEditingLedger(null);
                    setFormData({
                      cus_id: '',
                      debit_amount: '',
                      credit_amount: '',
                      bill_no: '',
                      trnx_type: 'CASH',
                      details: '',
                      payments: ''
                    });
                    setCustomerSearchTerm('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Account Selection */}
                <div className="relative customer-dropdown">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerDropdown(true);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, cus_id: '' }));
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search accounts..."
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-4" />
                    
                    {/* Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.cus_id}
                              onClick={() => selectCustomer(customer)}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{customer.cus_name}</div>
                              <div className="text-sm text-gray-500">
                                {customer.cus_phone_no} {customer.cus_email && `• ${customer.cus_email}`}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No accounts found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Customer Display */}
                  {formData.cus_id && getSelectedCustomer() && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-green-800">{getSelectedCustomer().cus_name}</div>
                          <div className="text-sm text-green-600">
                            {getSelectedCustomer().cus_phone_no} {getSelectedCustomer().cus_email && `• ${getSelectedCustomer().cus_email}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, cus_id: '' }));
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

                {/* Amount Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Debit Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Amount
                    </label>
                    <input
                      type="number"
                      name="debit_amount"
                      value={formData.debit_amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-black"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Credit Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Amount
                    </label>
                    <input
                      type="number"
                      name="credit_amount"
                      value={formData.credit_amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Transaction Type and Bill No */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Transaction Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Type *
                    </label>
                    <select
                      name="trnx_type"
                      value={formData.trnx_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Bill No */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bill Number
                    </label>
                    <input
                      type="text"
                      name="bill_no"
                      value={formData.bill_no}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                      placeholder="Enter bill number"
                    />
                  </div>
                </div>

                {/* Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Details
                  </label>
                  <textarea
                    name="details"
                    value={formData.details}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                    placeholder="Enter transaction details"
                  />
                </div>

                {/* Payments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payments
                  </label>
                  <input
                    type="number"
                    name="payments"
                    value={formData.payments}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                    placeholder="0.00"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLedgerForm(false);
                      setEditingLedger(null);
                      setFormData({
                        cus_id: '',
                        debit_amount: '',
                        credit_amount: '',
                        bill_no: '',
                        trnx_type: 'CASH',
                        details: '',
                        payments: ''
                      });
                      setCustomerSearchTerm('');
                    }}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {editingLedger ? 'Update Entry' : 'Create Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
