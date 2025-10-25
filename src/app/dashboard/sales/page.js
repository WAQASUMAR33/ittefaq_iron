'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ShoppingCart, 
  Search, 
  Filter,
  DollarSign,
  Hash,
  Calendar,
  Tag,
  Folder,
  FolderOpen,
  Box,
  TrendingUp,
  AlertCircle,
  Star,
  Eye,
  BarChart3,
  Truck,
  Package,
  Receipt,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  TrendingDown,
  Printer
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';
import SplitPaymentModal from './SplitPaymentModal';

export default function SalesPage() {
  // State management
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loaders, setLoaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSale, setEditingSale] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Product grid filter states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // Selected product for preview
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    qnty: '1',
    unit_rate: '',
    discount: '0'
  });
  
  // Customer dropdown filter states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Customer filter dropdown states
  const [customerFilterSearchTerm, setCustomerFilterSearchTerm] = useState('');
  const [showCustomerFilterDropdown, setShowCustomerFilterDropdown] = useState(false);

  // Receipt modal states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    cus_id: '',
    total_amount: '',
    discount: '',
    payment: '',
    payment_type: 'CASH',
    debit_account_id: '',
    credit_account_id: '',
    loader_id: '',
    shipping_amount: '',
    bill_type: 'BILL',
    reference: '',
    notes: '',
    sale_details: []
  });

  // Hold bill mode
  const [isHoldBillMode, setIsHoldBillMode] = useState(false);

  // Account search states
  const [debitAccountSearchTerm, setDebitAccountSearchTerm] = useState('');
  const [creditAccountSearchTerm, setCreditAccountSearchTerm] = useState('');
  const [showDebitAccountDropdown, setShowDebitAccountDropdown] = useState(false);
  const [showCreditAccountDropdown, setShowCreditAccountDropdown] = useState(false);
  
  // Split payment modal
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);

  // Split payment states
  const [splitPayments, setSplitPayments] = useState([]);
  const [useSplitPayment, setUseSplitPayment] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
      }
      if (showCustomerFilterDropdown && !event.target.closest('.customer-filter-dropdown')) {
        setShowCustomerFilterDropdown(false);
      }
      if (showDebitAccountDropdown && !event.target.closest('.debit-account-dropdown')) {
        setShowDebitAccountDropdown(false);
      }
      if (showCreditAccountDropdown && !event.target.closest('.credit-account-dropdown')) {
        setShowCreditAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown, showCustomerFilterDropdown, showDebitAccountDropdown, showCreditAccountDropdown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesRes, customersRes, productsRes, loadersRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/loaders')
      ]);

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

  // Filter and sort logic
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.sale_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || sale.cus_id === selectedCustomer;
    
    return matchesSearch && matchesCustomer;
  });

  // Product filtering logic
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.pro_title.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                         product.pro_description?.toLowerCase().includes(productSearchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Customer filtering logic
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_phone_no?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_email?.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  // Customer filter dropdown logic
  const filteredCustomersForFilter = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerFilterSearchTerm.toLowerCase()) ||
                         customer.cus_phone_no?.toLowerCase().includes(customerFilterSearchTerm.toLowerCase()) ||
                         customer.cus_email?.toLowerCase().includes(customerFilterSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedSales = filteredSales.sort((a, b) => {
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

  const finalSales = sortedSales.map((sale, index) => ({
    ...sale,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalSales = sales.length;
  const totalSalesValue = sales.reduce((sum, s) => sum + parseFloat(s.total_amount) - parseFloat(s.discount) + parseFloat(s.shipping_amount || 0), 0);
  const totalDiscount = sales.reduce((sum, s) => sum + parseFloat(s.discount), 0);
  const totalPayment = sales.reduce((sum, s) => sum + parseFloat(s.payment), 0);
  const totalShipping = sales.reduce((sum, s) => sum + parseFloat(s.shipping_amount || 0), 0);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle product selection (show in preview section)
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProductFormData({
      qnty: '1',
      unit_rate: product.pro_sale_price.toString(),
      discount: '0'
    });
  };

  // Add product to sale list
  const addProductToSale = () => {
    if (!selectedProduct) return;
    
    const existingDetail = formData.sale_details.find(detail => detail.pro_id === selectedProduct.pro_id);
    
    if (existingDetail) {
      alert('Product already exists in the sale list');
      return;
    }
    
    const totalAmount = (parseFloat(productFormData.qnty) * parseFloat(productFormData.unit_rate)) - parseFloat(productFormData.discount || 0);
    
    const newDetail = {
      pro_id: selectedProduct.pro_id,
      qnty: productFormData.qnty,
      unit: selectedProduct.pro_unit,
      unit_rate: productFormData.unit_rate,
      total_amount: totalAmount.toString(),
      discount: productFormData.discount
    };
    
    setFormData(prev => ({
      ...prev,
      sale_details: [...prev.sale_details, newDetail]
    }));
    
    // Reset selection
    setSelectedProduct(null);
    setProductFormData({
      qnty: '1',
      unit_rate: '',
      discount: '0'
    });
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, cus_id: customer.cus_id }));
    setCustomerSearchTerm(customer.cus_name);
    setShowCustomerDropdown(false);
  };

  const selectCustomerForFilter = (customer) => {
    setSelectedCustomer(customer.cus_id);
    setCustomerFilterSearchTerm(customer.cus_name);
    setShowCustomerFilterDropdown(false);
  };

  const getSelectedCustomer = () => {
    return customers.find(customer => customer.cus_id === formData.cus_id);
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

  const removeSaleDetail = (index) => {
    setFormData(prev => ({
      ...prev,
      sale_details: prev.sale_details.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalAmount = () => {
    return formData.sale_details.reduce((sum, detail) => sum + parseFloat(detail.total_amount || 0), 0);
  };

  const calculateNetTotal = () => {
    const totalAmount = calculateTotalAmount();
    const discount = parseFloat(formData.discount || 0);
    const shippingAmount = parseFloat(formData.shipping_amount || 0);
    
    return totalAmount - discount + shippingAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Already submitting, please wait...');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Validation
      if (!formData.cus_id) {
        alert('Please select a customer');
        return;
      }
      
      if (formData.sale_details.length === 0) {
        alert('Please add at least one product to the sale');
        return;
      }

      // Validate split payments if enabled (only for regular sales, not hold bills)
      if (useSplitPayment && !isHoldBillMode) {
        if (splitPayments.length === 0) {
          alert('Please add at least one split payment');
          return;
        }
        
        const splitTotal = calculateSplitTotal();
        const netTotal = calculatedTotalAmount - parseFloat(formData.discount || 0);
        
        if (Math.abs(splitTotal - netTotal) > 0.01) {
          alert(`Split payment total (${splitTotal.toFixed(2)}) must equal the net total (${netTotal.toFixed(2)})`);
          return;
        }
      }
      
      const url = isHoldBillMode ? '/api/hold-bills' : '/api/sales';
      const method = editingSale ? 'PUT' : 'POST';
      
      // Calculate total amount from sale details (items only, shipping will be added separately in API)
      const calculatedTotalAmount = calculateTotalAmount();
      
      const body = editingSale 
        ? { 
            id: editingSale.sale_id || editingSale.hold_bill_id, 
            ...formData, 
            total_amount: calculatedTotalAmount.toString(),
            split_payments: useSplitPayment ? splitPayments : [],
            hold_bill_details: isHoldBillMode ? formData.sale_details : undefined,
            status: isHoldBillMode ? 'DRAFT' : undefined
          } 
        : { 
            ...formData, 
            total_amount: calculatedTotalAmount.toString(),
            split_payments: useSplitPayment ? splitPayments : [],
            hold_bill_details: isHoldBillMode ? formData.sale_details : undefined,
            status: isHoldBillMode ? 'DRAFT' : undefined
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingSale(null);
        setFormData({
          cus_id: '',
          total_amount: '',
          discount: '',
          payment: '',
          payment_type: 'CASH',
          debit_account_id: '',
          credit_account_id: '',
          loader_id: '',
          shipping_amount: '',
          bill_type: 'BILL',
          reference: '',
          notes: '',
          sale_details: []
        });
        setSplitPayments([]);
        setUseSplitPayment(false);
        setDebitAccountSearchTerm('');
        setCreditAccountSearchTerm('');
        setIsHoldBillMode(false);
        
        const action = isHoldBillMode ? 'Hold Bill' : 'Sale';
        alert(`${action} ${editingSale ? 'updated' : 'created'} successfully!`);
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert(`Error saving sale: ${error.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      cus_id: sale.cus_id,
      total_amount: sale.total_amount.toString(),
      discount: sale.discount.toString(),
      payment: sale.payment.toString(),
      payment_type: sale.payment_type,
      debit_account_id: sale.debit_account_id || '',
      credit_account_id: sale.credit_account_id || '',
      loader_id: sale.loader_id || '',
      shipping_amount: sale.shipping_amount?.toString() || '',
      bill_type: sale.bill_type,
      reference: sale.reference || '',
      sale_details: sale.sale_details || []
    });
    setSplitPayments(sale.split_payments || []);
    setUseSplitPayment((sale.split_payments && sale.split_payments.length > 0) || false);
    
    // Set account search terms
    if (sale.debit_account) {
      setDebitAccountSearchTerm(sale.debit_account.cus_name);
    }
    if (sale.credit_account) {
      setCreditAccountSearchTerm(sale.credit_account.cus_name);
    }
    
    setCurrentView('create');
  };

  const handleDelete = async (saleId) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        const response = await fetch(`/api/sales?id=${saleId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting sale:', error);
      }
    }
  };

  const handleViewReceipt = (sale) => {
    setSelectedSaleForReceipt(sale);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedSaleForReceipt(null);
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

  // Render Sales List View
  const renderSalesListView = () => (
    <DashboardLayout>
      {/* Fixed Height Container with Overflow Hidden */}
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sales Management</h2>
              <p className="text-gray-600 mt-1">Manage your sales orders, customers, and revenue</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setIsHoldBillMode(true);
                  setCurrentView('create');
                }}
                className="group bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span className="flex items-center">
                  <Package className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                  Hold Bill
                </span>
              </button>
              <button
                onClick={() => {
                  console.log('Add New Sale button clicked');
                  setIsCreating(true);
                  try {
                    setIsHoldBillMode(false);
                    setCurrentView('create');
                    console.log('Current view set to:', 'create');
                  } catch (error) {
                    console.error('Error switching to create view:', error);
                    alert('Error opening create form. Please try again.');
                  } finally {
                    setIsCreating(false);
                  }
                }}
                disabled={isCreating || isSubmitting}
                className={`group bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 ${
                  isCreating || isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:from-blue-600 hover:to-cyan-600'
                }`}
              >
                <span className="flex items-center">
                  {isCreating ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Opening...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                      Add New Sale
                    </>
                  )}
                </span>
              </button>
            </div>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search sales..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Customer Filter */}
              <div className="relative customer-filter-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerFilterSearchTerm}
                    onChange={(e) => {
                      setCustomerFilterSearchTerm(e.target.value);
                      setShowCustomerFilterDropdown(true);
                      if (!e.target.value) {
                        setSelectedCustomer('');
                      }
                    }}
                    onFocus={() => setShowCustomerFilterDropdown(true)}
                    onClick={() => setShowCustomerFilterDropdown(true)}
                    placeholder="Search customers..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  
                  {/* Clear button */}
                  {customerFilterSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerFilterSearchTerm('');
                        setSelectedCustomer('');
                        setShowCustomerFilterDropdown(false);
                      }}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Dropdown */}
                  {showCustomerFilterDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* All Customers option */}
                      <div
                        onClick={() => {
                          setSelectedCustomer('');
                          setCustomerFilterSearchTerm('');
                          setShowCustomerFilterDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      >
                        <div className="font-medium text-gray-900">All Customers</div>
                      </div>
                      
                      {/* Filtered customers */}
                      {filteredCustomersForFilter.length > 0 ? (
                        filteredCustomersForFilter.map((customer) => (
                          <div
                            key={customer.cus_id}
                            onClick={() => selectCustomerForFilter(customer)}
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
                          No customers found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected Customer Display */}
                {selectedCustomer && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800">
                          {customers.find(c => c.cus_id === selectedCustomer)?.cus_name}
                        </div>
                        <div className="text-sm text-blue-600">
                          {customers.find(c => c.cus_id === selectedCustomer)?.cus_phone_no}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer('');
                          setCustomerFilterSearchTerm('');
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
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

        {/* Fixed Stats Cards Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSalesValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Discount</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDiscount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Payment</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPayment.toLocaleString()}</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Sales List</h3>
              <span className="text-sm text-gray-500">
                Showing {finalSales.length} of {sales.length} sales
              </span>
            </div>
            
            {finalSales.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCustomer
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by adding your first sale.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Sale</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-2">Amounts</div>
                    <div className="col-span-1">Payment</div>
                    <div className="col-span-1">Bill Type</div>
                    <div className="col-span-1">Created</div>
                    <div className="col-span-2">Updated By</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  {/* Mobile headers */}
                  <div className="lg:hidden px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales List
                  </div>
                </div>
                
                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalSales.map((sale) => {
                      return (
                        <div key={sale.sale_id}>
                          {/* Desktop Table Row */}
                          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* Sale */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Sale #{sale.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {sale.sale_id.toString().slice(-8)}</div>
                            </div>
                          </div>

                          {/* Customer */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{sale.customer?.cus_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{sale.customer?.cus_phone_no || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Amounts */}
                          <div className="col-span-2">
                            <div className="text-sm font-semibold text-green-600">{parseFloat(sale.total_amount).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              Items: {sale.sale_details?.length || 0} | 
                              Discount: {parseFloat(sale.discount).toFixed(2)}
                              {parseFloat(sale.shipping_amount || 0) > 0 && ` | Shipping: ${parseFloat(sale.shipping_amount).toFixed(2)}`}
                            </div>
                            <div className="text-xs text-blue-600">
                              Net: {(parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0)).toFixed(2)}
                            </div>
                          </div>

                          {/* Payment */}
                          <div className="col-span-1 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{sale.payment_type}</div>
                              <div className="text-xs text-gray-500">{parseFloat(sale.payment).toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Bill Type */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">{sale.bill_type}</div>
                          </div>

                          {/* Created */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Updated By */}
                          <div className="col-span-2 flex items-center">
                            {sale.updated_by_user?.full_name ? (
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-white text-xs font-bold">
                                    {sale.updated_by_user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {sale.updated_by_user.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {sale.updated_by_user.role || 'User'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">N/A</div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex items-center">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewReceipt(sale)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                title="View Receipt"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleViewReceipt(sale)}
                                className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                                title="Reprint Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(sale)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Sale"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(sale.sale_id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Sale"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          </div>

                          {/* Mobile Card Layout */}
                          <div className="lg:hidden p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Sale #{sale.sequentialId}</div>
                                  <div className="text-xs text-gray-500">ID: {sale.sale_id.toString().slice(-8)}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleViewReceipt(sale)}
                                    className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                    title="View Receipt"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleViewReceipt(sale)}
                                    className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                                    title="Reprint Receipt"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(sale)}
                                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                    title="Edit Sale"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(sale.sale_id)}
                                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    title="Delete Sale"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Customer */}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{sale.customer?.cus_name || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{sale.customer?.cus_phone_no || 'N/A'}</div>
                              </div>

                              {/* Amounts */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-green-600">{parseFloat(sale.total_amount).toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">
                                    Items: {sale.sale_details?.length || 0} | 
                                    Discount: {parseFloat(sale.discount).toFixed(2)}
                                    {parseFloat(sale.shipping_amount || 0) > 0 && ` | Ship: ${parseFloat(sale.shipping_amount).toFixed(2)}`}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    Net: {(parseFloat(sale.total_amount) - parseFloat(sale.discount) + parseFloat(sale.shipping_amount || 0)).toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">{sale.payment_type}</div>
                                  <div className="text-xs text-gray-500">{parseFloat(sale.payment).toFixed(2)}</div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div>{sale.bill_type}</div>
                                <div>{new Date(sale.created_at).toLocaleDateString()}</div>
                              </div>
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

  // Render Sales Create View
  const renderSalesCreateView = () => (
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
                  {editingSale ? `Edit ${isHoldBillMode ? 'Hold Bill' : 'Sale'}` : `Create New ${isHoldBillMode ? 'Hold Bill' : 'Sale'}`}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingSale 
                    ? `Update ${isHoldBillMode ? 'hold bill' : 'sale'} information` 
                    : `Select products and create ${isHoldBillMode ? 'hold bill order' : 'sale order'}`
                  }
                </p>
                {isHoldBillMode && (
                  <div className="mt-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium inline-block">
                    Hold Bill Mode - Items will be reserved but not processed
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Side - Product Grid */}
          <div className="w-full lg:w-1/3 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              {/* Product Grid Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Selection</h3>
                
                {/* Product Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>
              
              {/* Product List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.pro_id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedProduct?.pro_id === product.pro_id
                          ? 'border-2 border-blue-500 bg-blue-50'
                          : 'border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="flex items-center flex-1">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {product.pro_title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.category?.cat_name || 'N/A'} - {product.sub_category?.sub_cat_name || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {parseFloat(product.pro_sale_price).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Sale Price
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {product.pro_stock_qnty}
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredProducts.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <Package className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">No products found</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Sale Form */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              {/* Form Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sale Details</h3>
              </div>
              
              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Product Preview Section */}
                  {selectedProduct && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-300">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Eye className="w-5 h-5 mr-2 text-blue-600" />
                        Selected Product Details
                      </h4>
                      
                      {/* First Row - Product Info (Read-only) */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Product ID</label>
                          <div className="text-sm font-semibold text-gray-900">{selectedProduct.pro_id}</div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Product Title</label>
                          <div className="text-sm font-semibold text-gray-900">{selectedProduct.pro_title}</div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                          <div className="text-sm font-semibold text-gray-900">{selectedProduct.pro_stock_qnty} {selectedProduct.pro_unit}</div>
                        </div>
                      </div>
                      
                      {/* Second Row - Input Fields */}
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={productFormData.qnty}
                            onChange={(e) => setProductFormData(prev => ({ ...prev, qnty: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black mt-1"
                            placeholder="Qty"
                          />
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Rate/Unit *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productFormData.unit_rate}
                            onChange={(e) => setProductFormData(prev => ({ ...prev, unit_rate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black mt-1"
                            placeholder="Rate"
                          />
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Discount</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productFormData.discount}
                            onChange={(e) => setProductFormData(prev => ({ ...prev, discount: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black mt-1"
                            placeholder="Discount"
                          />
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount</label>
                          <div className="text-2xl font-bold text-blue-600 mt-1">
                            {((parseFloat(productFormData.qnty || 0) * parseFloat(productFormData.unit_rate || 0)) - parseFloat(productFormData.discount || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={addProductToSale}
                          disabled={!productFormData.qnty || !productFormData.unit_rate}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Add to Sale List
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(null)}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-semibold"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Selected Products Section - At the Top */}
                  {formData.sale_details.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-blue-600" />
                        Selected Products ({formData.sale_details.length})
                      </h4>
                      
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full bg-white border border-blue-200 rounded-lg">
                          {/* Table Header */}
                          <thead className="bg-blue-100">
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
                          
                          {/* Table Body */}
                          <tbody className="divide-y divide-blue-200">
                            {formData.sale_details.map((detail, index) => {
                              const product = products.find(p => p.pro_id === detail.pro_id);
                              return (
                                <tr key={index} className="hover:bg-blue-50 transition-colors duration-200">
                                  {/* Product Column */}
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900 text-sm">{product?.pro_title || 'Unknown Product'}</div>
                                  </td>
                                  
                                  {/* Quantity Column */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      value={detail.qnty}
                                      onChange={(e) => {
                                        const newQuantity = e.target.value;
                                        const updatedDetails = formData.sale_details.map((d, i) => 
                                          i === index
                                            ? {
                                                ...d,
                                                qnty: newQuantity,
                                                total_amount: (parseInt(newQuantity) * parseFloat(d.unit_rate)).toString()
                                              }
                                            : d
                                        );
                                        setFormData(prev => ({ ...prev, sale_details: updatedDetails }));
                                      }}
                                      min="1"
                                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    />
                                  </td>
                                  
                                  {/* Unit Rate Column */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      value={detail.unit_rate}
                                      onChange={(e) => {
                                        const newUnitRate = e.target.value;
                                        const updatedDetails = formData.sale_details.map((d, i) => 
                                          i === index
                                            ? {
                                                ...d,
                                                unit_rate: newUnitRate,
                                                total_amount: (parseInt(d.qnty) * parseFloat(newUnitRate)).toString()
                                              }
                                            : d
                                        );
                                        setFormData(prev => ({ ...prev, sale_details: updatedDetails }));
                                      }}
                                      step="0.01"
                                      min="0"
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    />
                                  </td>
                                  
                                  {/* Total Column */}
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-sm font-semibold text-blue-600">
                                      {parseFloat(detail.total_amount).toFixed(2)}
                                    </span>
                                  </td>
                                  
                                  {/* Action Column */}
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeSaleDetail(index)}
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
                  )}

                  {/* Form Fields Section - At the Bottom */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-gray-600" />
                      Sale Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Customer */}
                      <div className="sm:col-span-2 relative customer-dropdown">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Customer *
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
                            placeholder="Search customers..."
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
                                  No customers found
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

                      {/* Bill Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bill Type *
                        </label>
                        <select
                          name="bill_type"
                          value={formData.bill_type}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        >
                          <option value="QUOTATION">Quotation</option>
                          <option value="ORDER">Order</option>
                          <option value="BILL">Bill</option>
                        </select>
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

                      {/* Notes (for hold bills) */}
                      {isHoldBillMode && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                          </label>
                          <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                            placeholder="Enter any additional notes for this hold bill..."
                          />
                        </div>
                      )}

                      {/* Payment Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Type *
                        </label>
                        <select
                          name="payment_type"
                          value={formData.payment_type}
                          onChange={handleInputChange}
                          required
                          disabled={useSplitPayment}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black ${useSplitPayment ? 'bg-gray-100' : ''}`}
                        >
                          <option value="CASH">Cash</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                      </div>

                      {/* From Account (Debit) - Customer Type */}
                      {!useSplitPayment && (
                        <div className="sm:col-span-2 relative debit-account-dropdown">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            From Account (Debit) *
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
                      )}

                      {/* To Account (Credit) - Cash Account Type */}
                      {!useSplitPayment && (
                        <div className="sm:col-span-2 relative credit-account-dropdown">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            To Account (Credit) *
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

                      {/* Payment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Amount *
                        </label>
                        <input
                          type="number"
                          name="payment"
                          value={formData.payment}
                          onChange={handleInputChange}
                          required={!useSplitPayment}
                          step="0.01"
                          min="0"
                          disabled={useSplitPayment}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black ${useSplitPayment ? 'bg-gray-100' : ''}`}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Loader/Transport */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loader/Transport
                        </label>
                        <select
                          name="loader_id"
                          value={formData.loader_id}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        >
                          <option value="">Select Loader (Optional)</option>
                          {loaders.map((loader) => (
                            <option key={loader.loader_id} value={loader.loader_id}>
                              {loader.loader_name} - {loader.loader_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Shipping Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Shipping/Transport Amount
                        </label>
                        <input
                          type="number"
                          name="shipping_amount"
                          value={formData.shipping_amount}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Split Payment Toggle - Disabled for hold bills */}
                    {!isHoldBillMode && (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                            Split Payment
                          </h4>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={useSplitPayment}
                              onChange={(e) => {
                                setUseSplitPayment(e.target.checked);
                                if (e.target.checked && splitPayments.length === 0) {
                                  setShowSplitPaymentModal(true);
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Use Split Payment</span>
                          </label>
                        </div>

                      {useSplitPayment && (
                        <div className="space-y-4">
                          {splitPayments.length > 0 ? (
                            <>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      {splitPayments.length} payment(s) configured
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Total: {splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowSplitPaymentModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Payments
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowSplitPaymentModal(true)}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center font-medium shadow-md hover:shadow-lg"
                            >
                              <Plus className="w-5 h-5 mr-2" />
                              Configure Split Payments
                            </button>
                          )}
                        </div>
                      )}
                      </div>
                    )}
                  </div>

                  {/* Total Calculations */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
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
                      <div>
                        <span className="text-gray-600">Shipping/Loader:</span>
                        <span className="font-semibold ml-2 text-blue-600">
                          +{parseFloat(formData.shipping_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold ml-2">
                          {(calculateTotalAmount() - parseFloat(formData.discount || 0) + parseFloat(formData.shipping_amount || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="sm:col-span-2 pt-2 border-t border-green-300">
                        <span className="text-gray-900 font-semibold">Grand Total:</span>
                        <span className="font-bold ml-2 text-green-600 text-xl">
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
                      disabled={isSubmitting}
                      className={`w-full sm:w-auto px-8 py-3 font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                        isSubmitting
                          ? 'opacity-50 cursor-not-allowed bg-gray-400'
                          : isHoldBillMode 
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                      }`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {editingSale ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        editingSale 
                          ? `Update ${isHoldBillMode ? 'Hold Bill' : 'Sale'}` 
                          : `Create ${isHoldBillMode ? 'Hold Bill' : 'Sale'}`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  console.log('Current view:', currentView);
  
  return (
    <>
      {currentView === 'list' ? renderSalesListView() : renderSalesCreateView()}
      
      {/* Split Payment Modal */}
      <SplitPaymentModal
        isOpen={showSplitPaymentModal}
        onClose={() => setShowSplitPaymentModal(false)}
        splitPayments={splitPayments}
        setSplitPayments={setSplitPayments}
        netTotal={calculateNetTotal()}
        customers={customers}
      />

      {/* Receipt Modal */}
      {showReceiptModal && selectedSaleForReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Receipt className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Sale Receipt</h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={handleCloseReceiptModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                {/* Company Header */}
                <div className="text-center mb-6 border-b border-gray-200 pb-4">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Itefaq Builders</h1>
                  <p className="text-gray-600">Construction Materials & Hardware</p>
                  <p className="text-sm text-gray-500">Your Trusted Building Partner</p>
                </div>

                {/* Sale Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Sale Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Receipt No:</span>
                        <span className="font-medium">#{selectedSaleForReceipt.sequentialId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{new Date(selectedSaleForReceipt.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">{new Date(selectedSaleForReceipt.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bill Type:</span>
                        <span className="font-medium">{selectedSaleForReceipt.bill_type}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedSaleForReceipt.customer?.cus_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{selectedSaleForReceipt.customer?.cus_phone_no || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span className="font-medium text-right max-w-48">{selectedSaleForReceipt.customer?.cus_address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
                          <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">Rate</th>
                          <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">Discount</th>
                          <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSaleForReceipt.sale_details?.map((detail, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-sm">
                              <div>
                                <div className="font-medium">{detail.product?.pro_name || 'N/A'}</div>
                                <div className="text-gray-500 text-xs">{detail.product?.pro_description || ''}</div>
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm">{detail.qnty}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-sm">{parseFloat(detail.unit_rate).toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-sm">{parseFloat(detail.discount || 0).toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-sm font-medium">
                              {(parseFloat(detail.qnty) * parseFloat(detail.unit_rate) - parseFloat(detail.discount || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{parseFloat(selectedSaleForReceipt.total_amount).toFixed(2)}</span>
                      </div>
                      {parseFloat(selectedSaleForReceipt.discount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-red-600">-{parseFloat(selectedSaleForReceipt.discount).toFixed(2)}</span>
                        </div>
                      )}
                      {parseFloat(selectedSaleForReceipt.shipping_amount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium">{parseFloat(selectedSaleForReceipt.shipping_amount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-green-600">
                            {(parseFloat(selectedSaleForReceipt.total_amount) - parseFloat(selectedSaleForReceipt.discount || 0) + parseFloat(selectedSaleForReceipt.shipping_amount || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Type:</span>
                      <span className="font-medium">{selectedSaleForReceipt.payment_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-medium">{parseFloat(selectedSaleForReceipt.payment).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-500 mb-2">Thank you for your business!</p>
                  <p className="text-xs text-gray-400">For any queries, please contact us at your convenience.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
