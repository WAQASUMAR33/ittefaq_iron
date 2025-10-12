'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Package, 
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
  BarChart3
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function ProductsPage() {
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [stockFilter, setStockFilter] = useState('all');

  // Form data
  const [formData, setFormData] = useState({
    pro_title: '',
    pro_description: '',
    pro_cost_price: '',
    pro_sale_price: '',
    pro_baser_price: '',
    pro_stock_qnty: '',
    pro_unit: '',
    pro_packing: '',
    cat_id: '',
    sub_cat_id: ''
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, subcategoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/subcategories')
      ]);

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
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(sub => sub.cat_id === selectedCategory);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.pro_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.pro_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.cat_id === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || product.sub_cat_id === selectedSubcategory;
    
    let matchesStock = true;
    if (stockFilter === 'in-stock') {
      matchesStock = product.pro_stock_qnty > 10;
    } else if (stockFilter === 'low') {
      matchesStock = product.pro_stock_qnty > 0 && product.pro_stock_qnty <= 10;
    } else if (stockFilter === 'out') {
      matchesStock = product.pro_stock_qnty === 0;
    }

    return matchesSearch && matchesCategory && matchesSubcategory && matchesStock;
  });

  const sortedProducts = filteredProducts.sort((a, b) => {
    let aValue, bValue;
    
    if (sortBy === 'pro_title') {
      aValue = a.pro_title.toLowerCase();
      bValue = b.pro_title.toLowerCase();
    } else if (sortBy === 'pro_sale_price') {
      aValue = parseFloat(a.pro_sale_price);
      bValue = parseFloat(b.pro_sale_price);
    } else if (sortBy === 'pro_stock_qnty') {
      aValue = a.pro_stock_qnty;
      bValue = b.pro_stock_qnty;
    } else {
      aValue = new Date(a[sortBy]);
      bValue = new Date(b[sortBy]);
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const finalProducts = sortedProducts.map((product, index) => ({
    ...product,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.pro_stock_qnty > 0 && p.pro_stock_qnty <= 10).length;
  const outOfStockProducts = products.filter(p => p.pro_stock_qnty === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.pro_sale_price) * p.pro_stock_qnty), 0);

  // Stock status helper
  const getStockStatus = (stock) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-50', icon: X };
    if (stock <= 10) return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle };
    return { color: 'text-green-600', bg: 'bg-green-50', icon: Check };
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingProduct ? '/api/products' : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const body = editingProduct ? { id: editingProduct.pro_id, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setShowProductForm(false);
        setEditingProduct(null);
        setFormData({
          pro_title: '',
          pro_description: '',
          pro_cost_price: '',
          pro_sale_price: '',
          pro_baser_price: '',
          pro_stock_qnty: '',
          pro_unit: '',
          pro_packing: '',
          cat_id: '',
          sub_cat_id: ''
        });
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      pro_title: product.pro_title,
      pro_description: product.pro_description,
      pro_cost_price: product.pro_cost_price.toString(),
      pro_sale_price: product.pro_sale_price.toString(),
      pro_baser_price: product.pro_baser_price.toString(),
      pro_stock_qnty: product.pro_stock_qnty.toString(),
      pro_unit: product.pro_unit,
      pro_packing: product.pro_packing || '',
      cat_id: product.cat_id,
      sub_cat_id: product.sub_cat_id
    });
    setShowProductForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products?id=${productId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setStockFilter('all');
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
              <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
              <p className="text-gray-600 mt-1">Manage your product inventory, pricing, and categories</p>
            </div>
            <button
              onClick={() => setShowProductForm(true)}
              className="group bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Add New Product
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="">All Subcategories</option>
                  {getFilteredSubcategories().map((subcategory) => (
                    <option key={subcategory.sub_cat_id} value={subcategory.sub_cat_id}>
                      {subcategory.sub_cat_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="all">All Stock</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
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
                  <option value="pro_title-asc">Name A-Z</option>
                  <option value="pro_title-desc">Name Z-A</option>
                  <option value="pro_sale_price-desc">Price High-Low</option>
                  <option value="pro_sale_price-asc">Price Low-High</option>
                  <option value="pro_stock_qnty-desc">Stock High-Low</option>
                  <option value="pro_stock_qnty-asc">Stock Low-High</option>
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
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">In Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts - lowStockProducts - outOfStockProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{lowStockProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Products List</h3>
              <span className="text-sm text-gray-500">
                Showing {finalProducts.length} of {products.length} products
              </span>
            </div>
            
            {finalProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCategory || selectedSubcategory || stockFilter !== 'all'
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by adding your first product.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Product</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-1">Pricing</div>
                    <div className="col-span-1">Stock</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-1">Created</div>
                    <div className="col-span-2">Updated By</div>
                    <div className="col-span-2">Actions</div>
                  </div>
                </div>
                
                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalProducts.map((product) => {
                      const stockStatus = getStockStatus(product.pro_stock_qnty);
                      const StatusIcon = stockStatus.icon;
                      
                      return (
                        <div key={product.pro_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* Product */}
                          <div className="col-span-2 flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.pro_title}</div>
                              <div className="text-xs text-gray-500">ID: #{product.sequentialId}</div>
                              {product.pro_description && (
                                <div className="text-xs text-gray-500 truncate max-w-32">{product.pro_description}</div>
                              )}
                            </div>
                          </div>

                          {/* Category */}
                          <div className="col-span-2 flex items-center">
                            <div className="flex flex-wrap gap-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Folder className="w-3 h-3 mr-1" />
                                {product.category?.cat_name || 'N/A'}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <FolderOpen className="w-3 h-3 mr-1" />
                                {product.sub_category?.sub_cat_name || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="col-span-1">
                            <div className="text-sm font-semibold text-green-600">${parseFloat(product.pro_sale_price).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Cost: ${parseFloat(product.pro_cost_price).toFixed(2)}</div>
                          </div>

                          {/* Stock */}
                          <div className="col-span-1 flex items-center">
                            <div className="flex items-center">
                              <StatusIcon className={`w-4 h-4 mr-1 ${stockStatus.color}`} />
                              <span className={`text-sm font-medium ${stockStatus.color}`}>
                                {product.pro_stock_qnty}
                              </span>
                            </div>
                          </div>

                          {/* Unit */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">{product.pro_unit}</div>
                          </div>

                          {/* Created */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">
                              {new Date(product.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Updated By */}
                          <div className="col-span-2 flex items-center">
                            {product.updated_by_user?.full_name ? (
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-white text-xs font-bold">
                                    {product.updated_by_user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.updated_by_user.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {product.updated_by_user.role || 'User'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">N/A</div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 flex items-center">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.pro_id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Product"
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

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background Overlay */}
            <div 
              className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-blue-900/60 to-purple-900/80 backdrop-blur-md transition-all duration-500 ease-out animate-fade-in" 
              onClick={() => setShowProductForm(false)}
            ></div>
            
            {/* Modal Container */}
            <div className="relative inline-block w-full max-w-2xl p-0 my-8 overflow-hidden text-left align-middle transition-all duration-500 ease-out transform bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 animate-slide-in-up">
              
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {editingProduct ? 'Update product information' : 'Fill in the product details below'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProductForm(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product Title */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Title *
                      </label>
                      <input
                        type="text"
                        name="pro_title"
                        value={formData.pro_title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="Enter product title"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="pro_description"
                        value={formData.pro_description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="Enter product description"
                      />
                    </div>

                    {/* Cost Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost Price *
                      </label>
                      <input
                        type="number"
                        name="pro_cost_price"
                        value={formData.pro_cost_price}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Sale Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sale Price *
                      </label>
                      <input
                        type="number"
                        name="pro_sale_price"
                        value={formData.pro_sale_price}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Base Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Price *
                      </label>
                      <input
                        type="number"
                        name="pro_baser_price"
                        value={formData.pro_baser_price}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Stock Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        name="pro_stock_qnty"
                        value={formData.pro_stock_qnty}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="0"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit *
                      </label>
                      <input
                        type="text"
                        name="pro_unit"
                        value={formData.pro_unit}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="e.g., pieces, kg, liters"
                      />
                    </div>

                    {/* Packing */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Packing
                      </label>
                      <input
                        type="text"
                        name="pro_packing"
                        value={formData.pro_packing}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                        placeholder="e.g., Box, Carton"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        name="cat_id"
                        value={formData.cat_id}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.cat_id} value={category.cat_id}>
                            {category.cat_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategory *
                      </label>
                      <select
                        name="sub_cat_id"
                        value={formData.sub_cat_id}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-black"
                      >
                        <option value="">Select Subcategory</option>
                        {getFilteredSubcategories().map((subcategory) => (
                          <option key={subcategory.sub_cat_id} value={subcategory.sub_cat_id}>
                            {subcategory.sub_cat_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}