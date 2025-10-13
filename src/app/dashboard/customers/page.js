'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Phone, Mail, MapPin, User, Building, CreditCard, Calendar, Search } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    cus_name: '',
    cus_phone_no: '',
    cus_phone_no2: '',
    cus_address: '',
    cus_reference: '',
    cus_account_info: '',
    other: '',
    cus_type: 'CASH_ACCOUNT',
    cus_category: 'Regular Customers',
    cus_balance: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');

  // Load data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, categoriesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/customer-category')
      ]);

      if (customersRes.ok && categoriesRes.ok) {
        const customersData = await customersRes.json();
        const categoriesData = await categoriesRes.json();
        
        setCustomers(customersData);
        setCustomerCategories(categoriesData);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers(prev => [...prev, newCustomer]);
        setShowCustomerForm(false);
        setFormData({
          cus_name: '',
          cus_phone_no: '',
          cus_phone_no2: '',
          cus_address: '',
          cus_reference: '',
          cus_account_info: '',
          other: '',
          cus_type: 'CASH_ACCOUNT',
          cus_category: '',
          cus_balance: 0
        });
        alert('Customer added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      cus_name: customer.cus_name || '',
      cus_phone_no: customer.cus_phone_no || '',
      cus_phone_no2: customer.cus_phone_no2 || '',
      cus_address: customer.cus_address || '',
      cus_reference: customer.cus_reference || '',
      cus_account_info: customer.cus_account_info || '',
      other: customer.other || '',
      cus_type: customer.cus_type || 'CASH_ACCOUNT',
      cus_category: customer.cus_category || '',
      cus_balance: customer.cus_balance || 0
    });
    setShowCustomerForm(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/customers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCustomer.cus_id,
          ...formData
        }),
      });

      if (response.ok) {
        const updatedCustomer = await response.json();
        setCustomers(prev => prev.map(customer => 
          customer.cus_id === editingCustomer.cus_id ? updatedCustomer : customer
        ));
        setShowCustomerForm(false);
        setEditingCustomer(null);
        setFormData({
          cus_name: '',
          cus_phone_no: '',
          cus_phone_no2: '',
          cus_address: '',
          cus_reference: '',
          cus_account_info: '',
          other: '',
          cus_type: 'CASH_ACCOUNT',
          cus_category: '',
          cus_balance: 0
        });
        alert('Customer updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const response = await fetch(`/api/customers?id=${customerId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCustomers(prev => prev.filter(customer => customer.cus_id !== customerId));
          alert('Customer deleted successfully!');
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer');
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.cus_name.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!formData.cus_phone_no.trim()) {
      alert('Phone number is required');
      return;
    }
    if (!formData.cus_address.trim()) {
      alert('Address is required');
      return;
    }
    if (!formData.cus_category) {
      alert('Customer category is required');
      return;
    }
    
    if (editingCustomer) {
      await handleUpdateCustomer(e);
    } else {
      await handleAddCustomer(e);
    }
  };

  // Filter customers based on search and filter criteria
  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.cus_phone_no.includes(searchTerm) ||
                           customer.cus_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.cus_reference?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || customer.cus_type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || customer.customer_category?.cus_cat_title === categoryFilter;
      
      let matchesBalance = true;
      if (balanceFilter === 'positive') {
        matchesBalance = parseFloat(customer.cus_balance) > 0;
      } else if (balanceFilter === 'negative') {
        matchesBalance = parseFloat(customer.cus_balance) < 0;
      } else if (balanceFilter === 'zero') {
        matchesBalance = parseFloat(customer.cus_balance) === 0;
      }
      
      return matchesSearch && matchesType && matchesCategory && matchesBalance;
    })
    .map((customer, index) => ({
      ...customer,
      sequentialId: index + 1
    }));

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setBalanceFilter('all');
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'CASH_ACCOUNT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCOUNT_PAYABLE':
        return 'bg-red-100 text-red-800';
      case 'ACCOUNT_RECEIVABLE':
        return 'bg-emerald-100 text-emerald-800';
      case 'EXPENSE_ACCOUNT':
        return 'bg-orange-100 text-orange-800';
      case 'ASSET_ACCOUNT':
        return 'bg-indigo-100 text-indigo-800';
      case 'LIABILITY_ACCOUNT':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBalanceColor = (balance) => {
    const bal = parseFloat(balance);
    if (bal > 0) return 'text-green-600';
    if (bal < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Get unique categories for filter dropdown
  const categories = [...new Set(customers.map(c => c.customer_category?.cus_cat_title || c.cus_category))];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
            <p className="text-gray-600 mt-1">Manage your customers and their information</p>
          </div>
          <button
            onClick={() => setShowCustomerForm(true)}
            className="group bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <span className="flex items-center">
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
              Add New Customer
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All Filters
            </button>
          </div>
          
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">All Types</option>
                <option value="CASH_ACCOUNT">Cash Account</option>
                <option value="ACCOUNT_PAYABLE">Account Payable</option>
                <option value="ACCOUNT_RECEIVABLE">Account Receivable</option>
                <option value="EXPENSE_ACCOUNT">Expense Account</option>
                <option value="ASSET_ACCOUNT">Asset Account</option>
                <option value="LIABILITY_ACCOUNT">Liability Account</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">All Categories</option>
                {customerCategories.map(category => (
                  <option key={category.cus_cat_id} value={category.cus_cat_title}>{category.cus_cat_title}</option>
                ))}
              </select>
            </div>

            {/* Balance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">All Balances</option>
                <option value="positive">Positive Balance</option>
                <option value="negative">Negative Balance</option>
                <option value="zero">Zero Balance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Account Types</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => ['CASH_ACCOUNT', 'ACCOUNT_PAYABLE', 'ACCOUNT_RECEIVABLE', 'EXPENSE_ACCOUNT', 'ASSET_ACCOUNT', 'LIABILITY_ACCOUNT'].includes(c.cus_type)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Positive Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => parseFloat(c.cus_balance) > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => {
                    const createdDate = new Date(c.created_at);
                    const thisMonth = new Date();
                    thisMonth.setDate(1);
                    return createdDate >= thisMonth;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Customers List</h3>
            <span className="text-sm text-gray-500">
              Showing {filteredCustomers.length} of {customers.length} customers
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.cus_id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">{customer.cus_name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.cus_name}</div>
                          <div className="text-sm text-gray-500">ID: #{customer.sequentialId}</div>
                          {customer.cus_reference && (
                            <div className="text-xs text-blue-600">Ref: {customer.cus_reference}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Phone className="w-3 h-3 mr-1 text-gray-400" />
                          {customer.cus_phone_no}
                        </div>
                        {customer.cus_phone_no2 && (
                          <div className="flex items-center mb-1">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {customer.cus_phone_no2}
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                          <span className="truncate max-w-32">{customer.cus_address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(customer.cus_type)}`}>
                        {customer.cus_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.customer_category?.cus_cat_title || customer.cus_category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getBalanceColor(customer.cus_balance)}`}>
                        {parseFloat(customer.cus_balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.cus_id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Modal */}
        {showCustomerForm && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background Overlay */}
              <div 
                className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-blue-900/60 to-purple-900/80 backdrop-blur-md transition-all duration-500 ease-out animate-fade-in" 
                onClick={() => setShowCustomerForm(false)}
              ></div>
              
              {/* Modal Container */}
              <div className="relative inline-block w-full max-w-4xl p-0 my-8 overflow-hidden text-left align-middle transition-all duration-500 ease-out transform bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 animate-slide-in-up">
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                        </h3>
                        <p className="text-blue-100 text-sm">
                          {editingCustomer ? 'Update customer information' : 'Create a new customer profile'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCustomerForm(false)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* First Row - Name and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          Customer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="cus_name"
                          value={formData.cus_name}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter customer name"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-2" />
                          Primary Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="cus_phone_no"
                          value={formData.cus_phone_no}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter primary phone number"
                        />
                      </div>
                    </div>

                    {/* Second Row - Secondary Phone and Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-2" />
                          Secondary Phone
                        </label>
                        <input
                          type="tel"
                          name="cus_phone_no2"
                          value={formData.cus_phone_no2}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter secondary phone number"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <MapPin className="w-4 h-4 inline mr-2" />
                          Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="cus_address"
                          value={formData.cus_address}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter customer address"
                        />
                      </div>
                    </div>

                    {/* Third Row - Type and Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Customer Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="cus_type"
                          value={formData.cus_type}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                        >
                          <option value="CASH_ACCOUNT">Cash Account</option>
                          <option value="ACCOUNT_PAYABLE">Account Payable</option>
                          <option value="ACCOUNT_RECEIVABLE">Account Receivable</option>
                          <option value="EXPENSE_ACCOUNT">Expense Account</option>
                          <option value="ASSET_ACCOUNT">Asset Account</option>
                          <option value="LIABILITY_ACCOUNT">Liability Account</option>
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="cus_category"
                          value={formData.cus_category}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                        >
                          <option value="">Select a category</option>
                          {customerCategories.map(category => (
                            <option key={category.cus_cat_id} value={category.cus_cat_id}>
                              {category.cus_cat_title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Fourth Row - Reference and Account Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Reference
                        </label>
                        <input
                          type="text"
                          name="cus_reference"
                          value={formData.cus_reference}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter reference number"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Account Info
                        </label>
                        <input
                          type="text"
                          name="cus_account_info"
                          value={formData.cus_account_info}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter account information"
                        />
                      </div>
                    </div>

                    {/* Fifth Row - Balance and Other */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <CreditCard className="w-4 h-4 inline mr-2" />
                          Balance
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="cus_balance"
                          value={formData.cus_balance}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter customer balance"
                        />
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Other Information
                        </label>
                        <input
                          type="text"
                          name="other"
                          value={formData.other}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter additional information"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowCustomerForm(false)}
                        className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="group px-8 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <span className="flex items-center">
                          {editingCustomer ? 'Update Customer' : 'Create Customer'}
                          <Check className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
