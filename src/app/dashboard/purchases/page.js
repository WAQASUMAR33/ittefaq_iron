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
  ArrowRight
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function PurchasesPage() {
  // State management
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Product grid filter states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  
  // Customer dropdown filter states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    cus_id: '',
    total_amount: '',
    unloading_amount: '',
    fare_amount: '',
    discount: '',
    payment: '',
    payment_type: 'CASH',
    vehicle_no: '',
    purchase_details: []
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
      const [purchasesRes, customersRes, productsRes, categoriesRes, subcategoriesRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/subcategories')
      ]);

      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json();
        setPurchases(purchasesData);
      }
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
      if (subcategoriesRes.ok) {
        const subcategoriesData = await subcategoriesRes.json();
        setSubcategories(subcategoriesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || purchase.cus_id === selectedCustomer;
    
    return matchesSearch && matchesCustomer;
  });

  // Product filtering logic
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(sub => sub.cat_id === selectedCategory);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.pro_title.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                         product.pro_description?.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.cat_id === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || product.sub_cat_id === selectedSubcategory;
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Customer filtering logic
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_phone_no?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         customer.cus_email?.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedPurchases = filteredPurchases.sort((a, b) => {
    let aValue, bValue;
    
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'net_total') {
      aValue = parseFloat(a.net_total);
      bValue = parseFloat(b.net_total);
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

  const finalPurchases = sortedPurchases.map((purchase, index) => ({
    ...purchase,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalPurchases = purchases.length;
  const totalPurchaseValue = purchases.reduce((sum, p) => sum + parseFloat(p.net_total), 0);
  const totalUnloadingAmount = purchases.reduce((sum, p) => sum + parseFloat(p.unloading_amount), 0);
  const totalFareAmount = purchases.reduce((sum, p) => sum + parseFloat(p.fare_amount), 0);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addProductToPurchase = (product) => {
    const existingDetail = formData.purchase_details.find(detail => detail.pro_id === product.pro_id);
    
    if (existingDetail) {
      // Update quantity if product already exists
      const updatedDetails = formData.purchase_details.map(detail => 
        detail.pro_id === product.pro_id 
          ? {
              ...detail,
              qnty: (parseInt(detail.qnty) + 1).toString(),
              total_amount: ((parseInt(detail.qnty) + 1) * parseFloat(detail.unit_rate)).toString()
            }
          : detail
      );
      setFormData(prev => ({ ...prev, purchase_details: updatedDetails }));
    } else {
      // Add new product
      const newDetail = {
        pro_id: product.pro_id,
        qnty: '1',
        unit: product.pro_unit,
        unit_rate: product.pro_cost_price.toString(),
        total_amount: product.pro_cost_price.toString()
      };
      
      setFormData(prev => ({
        ...prev,
        purchase_details: [...prev.purchase_details, newDetail]
      }));
    }
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, cus_id: customer.cus_id }));
    setCustomerSearchTerm(customer.cus_name);
    setShowCustomerDropdown(false);
  };

  const getSelectedCustomer = () => {
    return customers.find(customer => customer.cus_id === formData.cus_id);
  };

  const removePurchaseDetail = (index) => {
    setFormData(prev => ({
      ...prev,
      purchase_details: prev.purchase_details.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalAmount = () => {
    return formData.purchase_details.reduce((sum, detail) => sum + parseFloat(detail.total_amount || 0), 0);
  };

  const calculateNetTotal = () => {
    const totalAmount = calculateTotalAmount();
    const unloadingAmount = parseFloat(formData.unloading_amount || 0);
    const fareAmount = parseFloat(formData.fare_amount || 0);
    const discount = parseFloat(formData.discount || 0);
    
    return totalAmount + unloadingAmount + fareAmount - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingPurchase ? '/api/purchases' : '/api/purchases';
      const method = editingPurchase ? 'PUT' : 'POST';
      const body = editingPurchase ? { id: editingPurchase.pur_id, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingPurchase(null);
        setFormData({
          cus_id: '',
          total_amount: '',
          unloading_amount: '',
          fare_amount: '',
          discount: '',
          payment: '',
          payment_type: 'CASH',
          vehicle_no: '',
          purchase_details: []
        });
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
    }
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      cus_id: purchase.cus_id,
      total_amount: purchase.total_amount.toString(),
      unloading_amount: purchase.unloading_amount.toString(),
      fare_amount: purchase.fare_amount.toString(),
      discount: purchase.discount.toString(),
      payment: purchase.payment.toString(),
      payment_type: purchase.payment_type,
      vehicle_no: purchase.vehicle_no || '',
      purchase_details: purchase.purchase_details || []
    });
    setCurrentView('create');
  };

  const handleDelete = async (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        const response = await fetch(`/api/purchases?id=${purchaseId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting purchase:', error);
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

  // Render Purchase List View
  const renderPurchaseListView = () => (
    <DashboardLayout>
      {/* Fixed Height Container with Overflow Hidden */}
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Purchase Management</h2>
              <p className="text-gray-600 mt-1">Manage your purchase orders, suppliers, and inventory</p>
            </div>
            <button
              onClick={() => setCurrentView('create')}
              className="group bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Add New Purchase
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
                    placeholder="Search purchases..."
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
                  <option value="net_total-desc">Amount High-Low</option>
                  <option value="net_total-asc">Amount Low-High</option>
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
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPurchases}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPurchaseValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Unloading Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{totalUnloadingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fare Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFareAmount.toLocaleString()}</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Purchases List</h3>
              <span className="text-sm text-gray-500">
                Showing {finalPurchases.length} of {purchases.length} purchases
              </span>
            </div>
            
            {finalPurchases.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No purchases found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCustomer
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by adding your first purchase.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Purchase</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-2">Amounts</div>
                    <div className="col-span-1">Payment</div>
                    <div className="col-span-1">Vehicle</div>
                    <div className="col-span-1">Created</div>
                    <div className="col-span-2">Updated By</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>
                
                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalPurchases.map((purchase) => {
                      return (
                        <div key={purchase.pur_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* Purchase */}
                          <div className="col-span-2 flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                              <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">Purchase #{purchase.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {purchase.pur_id.slice(-8)}</div>
                            </div>
                          </div>

                          {/* Customer */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{purchase.customer?.cus_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{purchase.customer?.cus_phone_no || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Amounts */}
                          <div className="col-span-2">
                            <div className="text-sm font-semibold text-green-600">{parseFloat(purchase.net_total).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              Total: {parseFloat(purchase.total_amount).toFixed(2)} | 
                              Unload: {parseFloat(purchase.unloading_amount).toFixed(2)} | 
                              Fare: {parseFloat(purchase.fare_amount).toFixed(2)}
                            </div>
                            {purchase.discount > 0 && (
                              <div className="text-xs text-red-500">Discount: -{parseFloat(purchase.discount).toFixed(2)}</div>
                            )}
                          </div>

                          {/* Payment */}
                          <div className="col-span-1 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{purchase.payment_type}</div>
                              <div className="text-xs text-gray-500">{parseFloat(purchase.payment).toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Vehicle */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">{purchase.vehicle_no || 'N/A'}</div>
                          </div>

                          {/* Created */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Updated By */}
                          <div className="col-span-2 flex items-center">
                            {purchase.updated_by_user?.full_name ? (
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-white text-xs font-bold">
                                    {purchase.updated_by_user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {purchase.updated_by_user.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {purchase.updated_by_user.role || 'User'}
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
                                onClick={() => handleEdit(purchase)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Purchase"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(purchase.pur_id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Purchase"
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

  // Render Purchase Create View
  const renderPurchaseCreateView = () => (
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
                  {editingPurchase ? 'Edit Purchase' : 'Create New Purchase'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingPurchase ? 'Update purchase information' : 'Select products and create purchase order'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex gap-6">
          {/* Left Side - Product Grid */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              {/* Product Grid Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Selection</h3>
                
                {/* Product Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubcategory('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.cat_id} value={category.cat_id}>
                          {category.cat_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
                    >
                      <option value="">All Subcategories</option>
                      {getFilteredSubcategories().map((subcategory) => (
                        <option key={subcategory.sub_cat_id} value={subcategory.sub_cat_id}>
                          {subcategory.sub_cat_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Product List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.pro_id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 cursor-pointer group"
                      onClick={() => addProductToPurchase(product)}
                    >
                      <div className="flex items-center flex-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm group-hover:text-green-600 transition-colors">
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
                            {parseFloat(product.pro_cost_price).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost Price
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
                        <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          Click to Add
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

          {/* Right Side - Purchase Form */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
              {/* Form Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Purchase Details</h3>
              </div>
              
              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Selected Products Section - At the Top */}
                  {formData.purchase_details.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-blue-600" />
                        Selected Products ({formData.purchase_details.length})
                      </h4>
                      <div className="space-y-2">
                        {formData.purchase_details.map((detail, index) => {
                          const product = products.find(p => p.pro_id === detail.pro_id);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors duration-200">
                              <div className="flex items-center flex-1">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                  <Package className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">{product?.pro_title || 'Unknown Product'}</div>
                                  <div className="text-xs text-gray-500">
                                    {product?.pro_description || 'No description'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                {/* Quantity Controls */}
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedDetails = formData.purchase_details.map((d, i) => 
                                        i === index && parseInt(d.qnty) > 1
                                          ? {
                                              ...d,
                                              qnty: (parseInt(d.qnty) - 1).toString(),
                                              total_amount: ((parseInt(d.qnty) - 1) * parseFloat(d.unit_rate)).toString()
                                            }
                                          : d
                                      );
                                      setFormData(prev => ({ ...prev, purchase_details: updatedDetails }));
                                    }}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                    disabled={parseInt(detail.qnty) <= 1}
                                  >
                                    <span className="text-xs font-bold">-</span>
                                  </button>
                                  <span className="text-sm font-medium text-gray-900 min-w-[30px] text-center">
                                    {detail.qnty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedDetails = formData.purchase_details.map((d, i) => 
                                        i === index
                                          ? {
                                              ...d,
                                              qnty: (parseInt(d.qnty) + 1).toString(),
                                              total_amount: ((parseInt(d.qnty) + 1) * parseFloat(d.unit_rate)).toString()
                                            }
                                          : d
                                      );
                                      setFormData(prev => ({ ...prev, purchase_details: updatedDetails }));
                                    }}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                  >
                                    <span className="text-xs font-bold">+</span>
                                  </button>
                                </div>
                                
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">
                                    {detail.unit}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    @ {parseFloat(detail.unit_rate).toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-blue-600">
                                    {parseFloat(detail.total_amount).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Total
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePurchaseDetail(index)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                  title="Remove Product"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Form Fields Section - At the Bottom */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-gray-600" />
                      Purchase Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer */}
                      <div className="md:col-span-2 relative customer-dropdown">
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
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
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

                      {/* Vehicle Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vehicle Number
                        </label>
                        <input
                          type="text"
                          name="vehicle_no"
                          value={formData.vehicle_no}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                          placeholder="Enter vehicle number"
                        />
                      </div>

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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                      </div>

                      {/* Unloading Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unloading Amount
                        </label>
                        <input
                          type="number"
                          name="unloading_amount"
                          value={formData.unloading_amount}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Fare Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fare Amount
                        </label>
                        <input
                          type="number"
                          name="fare_amount"
                          value={formData.fare_amount}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                          placeholder="0.00"
                        />
                      </div>

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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
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
                          required
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-black"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Calculations */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                      Total Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Items Total:</span>
                        <span className="font-semibold ml-2">{calculateTotalAmount().toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unloading + Fare:</span>
                        <span className="font-semibold ml-2">
                          {(parseFloat(formData.unloading_amount || 0) + parseFloat(formData.fare_amount || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-semibold ml-2 text-red-600">
                          -{parseFloat(formData.discount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Net Total:</span>
                        <span className="font-semibold ml-2 text-green-600 text-lg">
                          {calculateNetTotal().toFixed(2)}
                        </span>
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
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      {editingPurchase ? 'Update Purchase' : 'Create Purchase'}
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

  return (
    <>
      {currentView === 'list' ? renderPurchaseListView() : renderPurchaseCreateView()}
    </>
  );
}