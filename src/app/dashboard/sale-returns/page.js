'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  Package,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Eye,
  X,
  RotateCcw,
  Truck
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function SaleReturnsPage() {
  // State management
  const [saleReturns, setSaleReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loaders, setLoaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Selected sale for return
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [showSaleDropdown, setShowSaleDropdown] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    sale_id: '',
    cus_id: '',
    total_amount: '',
    discount: '',
    payment: '',
    payment_type: 'CASH',
    debit_account_id: '',
    credit_account_id: '',
    loader_id: '',
    shipping_amount: '',
    reason: '',
    reference: '',
    return_details: []
  });

  // Account search states
  const [debitAccountSearchTerm, setDebitAccountSearchTerm] = useState('');
  const [creditAccountSearchTerm, setCreditAccountSearchTerm] = useState('');
  const [showDebitAccountDropdown, setShowDebitAccountDropdown] = useState(false);
  const [showCreditAccountDropdown, setShowCreditAccountDropdown] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [returnsRes, salesRes, customersRes, productsRes, loadersRes] = await Promise.all([
        fetch('/api/sale-returns'),
        fetch('/api/sales'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/loaders')
      ]);

      if (returnsRes.ok) {
        const returnsData = await returnsRes.json();
        setSaleReturns(returnsData);
      }
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData);
      }
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
      if (loadersRes.ok) {
        const loadersData = await loadersRes.json();
        setLoaders(loadersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to filter accounts by type
  const getCustomerAccounts = () => {
    return customers.filter(c => c.customer_type?.cus_type_title === 'Customer');
  };

  const getCashAccounts = () => {
    return customers.filter(c => c.customer_type?.cus_type_title === 'Cash Account');
  };

  const getFilteredCustomerAccounts = () => {
    const accounts = getCustomerAccounts();
    if (!debitAccountSearchTerm) return accounts;
    return accounts.filter(c => 
      c.cus_name.toLowerCase().includes(debitAccountSearchTerm.toLowerCase()) ||
      c.cus_phone_no?.toLowerCase().includes(debitAccountSearchTerm.toLowerCase())
    );
  };

  const getFilteredCashAccounts = () => {
    const accounts = getCashAccounts();
    if (!creditAccountSearchTerm) return accounts;
    return accounts.filter(c => 
      c.cus_name.toLowerCase().includes(creditAccountSearchTerm.toLowerCase()) ||
      c.cus_phone_no?.toLowerCase().includes(creditAccountSearchTerm.toLowerCase())
    );
  };

  // Filter and sort logic
  const filteredReturns = saleReturns.filter(ret => {
    const matchesSearch = ret.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ret.return_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ret.sale_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || ret.cus_id === selectedCustomer;
    
    return matchesSearch && matchesCustomer;
  });

  const sortedReturns = filteredReturns.sort((a, b) => {
    let aValue, bValue;
    
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'total_amount') {
      aValue = parseFloat(a.total_amount);
      bValue = parseFloat(b.total_amount);
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

  const finalReturns = sortedReturns.map((ret, index) => ({
    ...ret,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalReturns = saleReturns.length;
  const totalReturnsValue = saleReturns.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
  const totalDiscount = saleReturns.reduce((sum, r) => sum + parseFloat(r.discount), 0);
  const totalRefund = saleReturns.reduce((sum, r) => sum + parseFloat(r.payment), 0);

  // Filter sales that can be returned
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer?.cus_name.toLowerCase().includes(saleSearchTerm.toLowerCase()) ||
                         sale.sale_id?.toLowerCase().includes(saleSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const selectSale = (sale) => {
    setSelectedSale(sale);
    setSaleSearchTerm(`Sale #${sale.sale_id.toString().slice(-8)} - ${sale.customer?.cus_name}`);
    setShowSaleDropdown(false);
    
    // Pre-fill form with sale data
    setFormData({
      sale_id: sale.sale_id,
      cus_id: sale.cus_id,
      total_amount: sale.total_amount.toString(),
      discount: sale.discount.toString(),
      payment: sale.payment.toString(),
      payment_type: sale.payment_type,
      debit_account_id: sale.credit_account_id || '', // Reverse: from becomes to
      credit_account_id: sale.debit_account_id || '', // Reverse: to becomes from
      loader_id: sale.loader_id || '',
      shipping_amount: sale.shipping_amount?.toString() || '',
      reason: '',
      reference: sale.reference || '',
      return_details: sale.sale_details.map(detail => ({
        pro_id: detail.pro_id,
        qnty: detail.qnty,
        unit: detail.unit,
        unit_rate: detail.unit_rate.toString(),
        total_amount: detail.total_amount.toString(),
        discount: detail.discount.toString()
      }))
    });

    // Set account search terms
    if (sale.credit_account) {
      setDebitAccountSearchTerm(sale.credit_account.cus_name);
    }
    if (sale.debit_account) {
      setCreditAccountSearchTerm(sale.debit_account.cus_name);
    }
  };

  const selectDebitAccount = (account) => {
    setFormData(prev => ({ ...prev, debit_account_id: account.cus_id }));
    setDebitAccountSearchTerm(account.cus_name);
    setShowDebitAccountDropdown(false);
  };

  const selectCreditAccount = (account) => {
    setFormData(prev => ({ ...prev, credit_account_id: account.cus_id }));
    setCreditAccountSearchTerm(account.cus_name);
    setShowCreditAccountDropdown(false);
  };

  const getSelectedDebitAccount = () => {
    return customers.find(c => c.cus_id === formData.debit_account_id);
  };

  const getSelectedCreditAccount = () => {
    return customers.find(c => c.cus_id === formData.credit_account_id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const removeReturnDetail = (index) => {
    setFormData(prev => ({
      ...prev,
      return_details: prev.return_details.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalAmount = () => {
    return formData.return_details.reduce((sum, detail) => sum + parseFloat(detail.total_amount || 0), 0);
  };

  const calculateNetTotal = () => {
    const totalAmount = calculateTotalAmount();
    const discount = parseFloat(formData.discount || 0);
    
    return totalAmount - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validation
      if (!formData.sale_id) {
        alert('Please select a sale to return');
        return;
      }
      
      if (formData.return_details.length === 0) {
        alert('Please add at least one product to return');
        return;
      }

      const url = '/api/sale-returns';
      const method = 'POST';
      
      // Calculate total amount from return details
      const calculatedTotalAmount = calculateTotalAmount();
      
      const body = { 
        ...formData, 
        total_amount: calculatedTotalAmount.toString()
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setSelectedSale(null);
        setSaleSearchTerm('');
        setFormData({
          sale_id: '',
          cus_id: '',
          total_amount: '',
          discount: '',
          payment: '',
          payment_type: 'CASH',
          debit_account_id: '',
          credit_account_id: '',
          loader_id: '',
          shipping_amount: '',
          reason: '',
          reference: '',
          return_details: []
        });
        setDebitAccountSearchTerm('');
        setCreditAccountSearchTerm('');
      } else {
        const errorData = await response.json();
        alert('Error: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error saving sale return:', error);
      alert('Error saving sale return');
    }
  };

  const handleDelete = async (returnId) => {
    if (window.confirm('Are you sure you want to delete this sale return?')) {
      try {
        const response = await fetch(`/api/sale-returns?id=${returnId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        } else {
          const errorData = await response.json();
          alert('Error: ' + errorData.error);
        }
      } catch (error) {
        console.error('Error deleting sale return:', error);
        alert('Error deleting sale return');
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

  // Render List View
  const renderListView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sale Returns Management</h2>
              <p className="text-gray-600 mt-1">Manage product returns and refunds</p>
            </div>
            <button
              onClick={() => setCurrentView('create')}
              className="group bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Process Return
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search returns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Customer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.cus_id} value={customer.cus_id}>
                      {customer.cus_name}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="customer-asc">Customer A-Z</option>
                  <option value="customer-desc">Customer Z-A</option>
                  <option value="total_amount-desc">Amount High-Low</option>
                  <option value="total_amount-asc">Amount Low-High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Returns</p>
                  <p className="text-2xl font-bold text-gray-900">{totalReturns}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{totalReturnsValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Discount</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDiscount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Refund</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRefund.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Returns List</h3>
              <span className="text-sm text-gray-500">
                Showing {finalReturns.length} of {saleReturns.length} returns
              </span>
            </div>
            
            {finalReturns.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No returns found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCustomer
                      ? 'Try adjusting your filters to see more results.'
                      : 'Process your first return.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Return #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sale Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Refund
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loader
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {finalReturns.map((ret) => (
                      <tr key={ret.return_id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Return #{ret.sequentialId}</div>
                          <div className="text-xs text-gray-500">ID: {ret.return_id.toString().slice(-8)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{ret.sale_id.slice(-8)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{ret.customer?.cus_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{ret.customer?.cus_phone_no || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-red-600">{parseFloat(ret.total_amount).toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            Items: {ret.return_details?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{parseFloat(ret.payment).toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{ret.payment_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ret.loader ? (
                            <div>
                              <div className="text-sm text-gray-900">{ret.loader.loader_name}</div>
                              <div className="text-xs text-red-500">-{parseFloat(ret.shipping_amount).toFixed(2)}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">N/A</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(ret.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(ret.return_id)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete Return"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  // Render Create View
  const renderCreateView = () => (
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
                <h2 className="text-2xl font-bold text-gray-900">Process Sale Return</h2>
                <p className="text-gray-600 mt-1">Select a sale and process product returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Select Sale */}
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-300">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Sale to Return</h4>
                <div className="relative">
                  <input
                    type="text"
                    value={saleSearchTerm}
                    onChange={(e) => {
                      setSaleSearchTerm(e.target.value);
                      setShowSaleDropdown(true);
                      if (!e.target.value) {
                        setSelectedSale(null);
                        setFormData({
                          sale_id: '',
                          cus_id: '',
                          total_amount: '',
                          discount: '',
                          payment: '',
                          payment_type: 'CASH',
                          debit_account_id: '',
                          credit_account_id: '',
                          loader_id: '',
                          shipping_amount: '',
                          reason: '',
                          reference: '',
                          return_details: []
                        });
                      }
                    }}
                    onFocus={() => setShowSaleDropdown(true)}
                    placeholder="Search sales..."
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-4" />
                  
                  {/* Dropdown */}
                  {showSaleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredSales.length > 0 ? (
                        filteredSales.map((sale) => (
                          <div
                            key={sale.sale_id}
                            onClick={() => selectSale(sale)}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">
                              Sale #{sale.sale_id.toString().slice(-8)} - {sale.customer?.cus_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Amount: {parseFloat(sale.total_amount).toFixed(2)} | 
                              Items: {sale.sale_details?.length || 0} |
                              Date: {new Date(sale.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          No sales found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Sale Details */}
              {selectedSale && (
                <>
                  {/* Products in Return */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-red-600" />
                      Products to Return ({formData.return_details.length})
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full bg-white border border-red-200 rounded-lg">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Unit Rate
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                          {formData.return_details.map((detail, index) => {
                            const product = products.find(p => p.pro_id === detail.pro_id);
                            return (
                              <tr key={index} className="hover:bg-red-50 transition-colors duration-200">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900 text-sm">{product?.pro_title || 'Unknown Product'}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    value={detail.qnty}
                                    onChange={(e) => {
                                      const newQuantity = e.target.value;
                                      const updatedDetails = formData.return_details.map((d, i) => 
                                        i === index
                                          ? {
                                              ...d,
                                              qnty: newQuantity,
                                              total_amount: (parseInt(newQuantity) * parseFloat(d.unit_rate)).toString()
                                            }
                                          : d
                                      );
                                      setFormData(prev => ({ ...prev, return_details: updatedDetails }));
                                    }}
                                    min="1"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500 text-black"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm text-gray-900">{parseFloat(detail.unit_rate).toFixed(2)}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm font-semibold text-red-600">
                                    {parseFloat(detail.total_amount).toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeReturnDetail(index)}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    title="Remove Product"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Return Information */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Return Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Reason */}
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Return Reason *
                        </label>
                        <textarea
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          required
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          placeholder="Enter reason for return..."
                        />
                      </div>

                      {/* Payment Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Refund Type *
                        </label>
                        <select
                          name="payment_type"
                          value={formData.payment_type}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                      </div>

                      {/* Refund Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Refund Amount *
                        </label>
                        <input
                          type="number"
                          name="payment"
                          value={formData.payment}
                          onChange={handleInputChange}
                          required
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          placeholder="0.00"
                        />
                      </div>

                      {/* To Account (Debit) */}
                      <div className="sm:col-span-2 relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To Account (Debit)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={debitAccountSearchTerm}
                            onChange={(e) => {
                              setDebitAccountSearchTerm(e.target.value);
                              setShowDebitAccountDropdown(true);
                              if (!e.target.value) {
                                setFormData(prev => ({ ...prev, debit_account_id: '' }));
                              }
                            }}
                            onFocus={() => setShowDebitAccountDropdown(true)}
                            placeholder="Search customer accounts..."
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          />
                          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-4" />
                          
                          {showDebitAccountDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {getFilteredCustomerAccounts().length > 0 ? (
                                getFilteredCustomerAccounts().map((account) => (
                                  <div
                                    key={account.cus_id}
                                    onClick={() => selectDebitAccount(account)}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{account.cus_name}</div>
                                    <div className="text-sm text-gray-500">{account.cus_phone_no}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-gray-500 text-center">
                                  No customer accounts found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {formData.debit_account_id && getSelectedDebitAccount() && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-green-800">{getSelectedDebitAccount().cus_name}</div>
                                <div className="text-sm text-green-600">{getSelectedDebitAccount().cus_phone_no}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, debit_account_id: '' }));
                                  setDebitAccountSearchTerm('');
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* From Account (Credit) */}
                      <div className="sm:col-span-2 relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Account (Credit)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={creditAccountSearchTerm}
                            onChange={(e) => {
                              setCreditAccountSearchTerm(e.target.value);
                              setShowCreditAccountDropdown(true);
                              if (!e.target.value) {
                                setFormData(prev => ({ ...prev, credit_account_id: '' }));
                              }
                            }}
                            onFocus={() => setShowCreditAccountDropdown(true)}
                            placeholder="Search cash accounts..."
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          />
                          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-4" />
                          
                          {showCreditAccountDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {getFilteredCashAccounts().length > 0 ? (
                                getFilteredCashAccounts().map((account) => (
                                  <div
                                    key={account.cus_id}
                                    onClick={() => selectCreditAccount(account)}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{account.cus_name}</div>
                                    <div className="text-sm text-gray-500">{account.cus_phone_no}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-gray-500 text-center">
                                  No cash accounts found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {formData.credit_account_id && getSelectedCreditAccount() && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-green-800">{getSelectedCreditAccount().cus_name}</div>
                                <div className="text-sm text-green-600">{getSelectedCreditAccount().cus_phone_no}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, credit_account_id: '' }));
                                  setCreditAccountSearchTerm('');
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Loader Info */}
                      {formData.loader_id && (
                        <div className="sm:col-span-2">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <Truck className="w-5 h-5 text-yellow-600 mr-2" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  Loader: {loaders.find(l => l.loader_id === formData.loader_id)?.loader_name}
                                </div>
                                <div className="text-sm text-yellow-600">
                                  Shipping amount -{parseFloat(formData.shipping_amount || 0).toFixed(2)} will be deducted from loader balance
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Discount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount
                        </label>
                        <input
                          type="number"
                          name="discount"
                          value={formData.discount}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Reference */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reference
                        </label>
                        <input
                          type="text"
                          name="reference"
                          value={formData.reference}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          placeholder="Enter reference number or notes"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Calculations */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-red-600" />
                      Total Summary
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Items Total:</span>
                        <span className="font-semibold ml-2">{calculateTotalAmount().toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-semibold ml-2 text-red-600">
                          -{parseFloat(formData.discount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-600">Net Total Return:</span>
                        <span className="font-semibold ml-2 text-red-600 text-lg">
                          {calculateNetTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCurrentView('list')}
                      className="w-full sm:w-auto px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      Process Return
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return currentView === 'list' ? renderListView() : renderCreateView();
}


