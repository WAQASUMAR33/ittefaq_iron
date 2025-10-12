'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, FolderOpen, Tag, Calendar, Package, Search, Hash, Folder, Filter } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function SubCategoriesPage() {
  // Categories data (would normally come from API/database)
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showSubCategoryForm, setShowSubCategoryForm] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [formData, setFormData] = useState({
    cat_id: '',
    sub_cat_name: '',
    sub_cat_code: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, subCategoriesRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/subcategories')
      ]);

      if (categoriesRes.ok && subCategoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const subCategoriesData = await subCategoriesRes.json();
        
        setCategories(categoriesData);
        setSubCategories(subCategoriesData);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubCategory = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/subcategories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newSubCategory = await response.json();
        setSubCategories(prev => [...prev, newSubCategory]);
        setShowSubCategoryForm(false);
        setFormData({
          cat_id: '',
          sub_cat_name: '',
          sub_cat_code: ''
        });
        alert('Subcategory added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create subcategory');
      }
    } catch (error) {
      console.error('Error creating subcategory:', error);
      alert('Failed to create subcategory');
    }
  };

  const handleEditSubCategory = (subCategory) => {
    setEditingSubCategory(subCategory);
    setFormData({
      cat_id: subCategory.cat_id || '',
      sub_cat_name: subCategory.sub_cat_name || '',
      sub_cat_code: subCategory.sub_cat_code || ''
    });
    setShowSubCategoryForm(true);
  };

  const handleUpdateSubCategory = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/subcategories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingSubCategory.sub_cat_id,
          ...formData
        }),
      });

      if (response.ok) {
        const updatedSubCategory = await response.json();
        setSubCategories(prev => prev.map(subCategory => 
          subCategory.sub_cat_id === editingSubCategory.sub_cat_id ? updatedSubCategory : subCategory
        ));
        setShowSubCategoryForm(false);
        setEditingSubCategory(null);
        setFormData({
          cat_id: '',
          sub_cat_name: '',
          sub_cat_code: ''
        });
        alert('Subcategory updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update subcategory');
      }
    } catch (error) {
      console.error('Error updating subcategory:', error);
      alert('Failed to update subcategory');
    }
  };

  const handleDeleteSubCategory = async (subCategoryId) => {
    if (window.confirm('Are you sure you want to delete this sub category? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/subcategories?id=${subCategoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSubCategories(prev => prev.filter(subCategory => subCategory.sub_cat_id !== subCategoryId));
          alert('Subcategory deleted successfully!');
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete subcategory');
        }
      } catch (error) {
        console.error('Error deleting subcategory:', error);
        alert('Failed to delete subcategory');
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

  const generateSubCategoryCode = (subCategoryName, categoryName) => {
    const words = subCategoryName.split(' ');
    let code = '';
    
    if (words.length === 1) {
      code = words[0].substring(0, 6).toUpperCase();
    } else {
      code = words.map(word => word.charAt(0)).join('').toUpperCase();
    }
    
    // Add category prefix if available
    if (categoryName) {
      const categoryPrefix = categoryName.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
      code = categoryPrefix + code;
    }
    
    // Add a number to make it unique
    const existingCodes = subCategories.map(subCat => subCat.sub_cat_code);
    let counter = 1;
    let finalCode = code + String(counter).padStart(3, '0');
    
    while (existingCodes.includes(finalCode)) {
      counter++;
      finalCode = code + String(counter).padStart(3, '0');
    }
    
    return finalCode;
  };

  const handleAutoGenerateCode = () => {
    if (formData.sub_cat_name && !formData.sub_cat_code) {
      const selectedCategory = categories.find(cat => cat.cat_id === formData.cat_id);
      const generatedCode = generateSubCategoryCode(formData.sub_cat_name, selectedCategory?.cat_name);
      setFormData(prev => ({
        ...prev,
        sub_cat_code: generatedCode
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.cat_id) {
      alert('Please select a category');
      return;
    }
    
    if (!formData.sub_cat_name.trim()) {
      alert('Sub category name is required');
      return;
    }
    
    if (!formData.sub_cat_code.trim()) {
      alert('Sub category code is required');
      return;
    }

    if (editingSubCategory) {
      await handleUpdateSubCategory(e);
    } else {
      await handleAddSubCategory(e);
    }
  };

  // Filter and sort sub categories
  const filteredAndSortedSubCategories = subCategories
    .filter(subCategory => {
      const matchesSearch = subCategory.sub_cat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           subCategory.sub_cat_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           subCategory.category.cat_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || subCategory.cat_id === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Handle numeric sorting
      if (sortBy === 'product_count') {
        aValue = parseInt(aValue);
        bValue = parseInt(bValue);
      }
      
      // Handle string sorting
      if (sortBy === 'category_name') {
        aValue = a.category.cat_name;
        bValue = b.category.cat_name;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    })
    .map((subCategory, index) => ({
      ...subCategory,
      sequentialId: index + 1
    }));

  // Calculate stats
  const totalSubCategories = subCategories.length;
  const totalProducts = subCategories.reduce((sum, subCat) => sum + subCat._count.products, 0);
  const averageProductsPerSubCat = totalSubCategories > 0 ? Math.round(totalProducts / totalSubCategories) : 0;
  const recentAdditions = subCategories.filter(subCat => {
    const createdDate = new Date(subCat.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  }).length;

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const getSubCategoryIcon = (subCategoryName) => {
    const name = subCategoryName.toLowerCase();
    if (name.includes('smartphone') || name.includes('phone')) return '📱';
    if (name.includes('laptop') || name.includes('computer')) return '💻';
    if (name.includes('men') || name.includes('women')) return '👔';
    if (name.includes('furniture')) return '🪑';
    if (name.includes('garden') || name.includes('tool')) return '🌱';
    if (name.includes('fitness') || name.includes('equipment')) return '🏋️';
    if (name.includes('outdoor') || name.includes('sport')) return '⚽';
    if (name.includes('book') || name.includes('fiction') || name.includes('education')) return '📚';
    return '📂';
  };

  const getCategoryColor = (categoryName) => {
    switch (categoryName) {
      case 'Electronics': return 'bg-blue-100 text-blue-800';
      case 'Clothing & Apparel': return 'bg-pink-100 text-pink-800';
      case 'Home & Garden': return 'bg-green-100 text-green-800';
      case 'Sports & Fitness': return 'bg-orange-100 text-orange-800';
      case 'Books & Media': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <h2 className="text-2xl font-bold text-gray-900">Sub Category Management</h2>
            <p className="text-gray-600 mt-1">Organize your products with subcategories under main categories</p>
          </div>
          <button
            onClick={() => setShowSubCategoryForm(true)}
            className="group bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <span className="flex items-center">
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
              Add New Sub Category
            </span>
          </button>
        </div>

        {/* Filters */}
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search sub categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
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
                {categories.map(category => (
                  <option key={category.cat_id} value={category.cat_id}>
                    {category.cat_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="sub_cat_name">Sub Category Name</option>
                <option value="sub_cat_code">Sub Category Code</option>
                <option value="category_name">Category Name</option>
                <option value="product_count">Product Count</option>
                <option value="created_at">Created Date</option>
                <option value="updated_at">Updated Date</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sub Categories</p>
                <p className="text-2xl font-bold text-gray-900">{totalSubCategories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
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
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Products/Sub Cat</p>
                <p className="text-2xl font-bold text-gray-900">{averageProductsPerSubCat}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Additions</p>
                <p className="text-2xl font-bold text-gray-900">{recentAdditions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Categories Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Sub Categories List</h3>
            <span className="text-sm text-gray-500">
              Showing {filteredAndSortedSubCategories.length} of {subCategories.length} sub categories
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedSubCategories.map((subCategory) => (
                  <tr key={subCategory.sub_cat_id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                          <span className="text-white text-lg">{getSubCategoryIcon(subCategory.sub_cat_name)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{subCategory.sub_cat_name}</div>
                          <div className="text-sm text-gray-500">ID: #{subCategory.sequentialId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <Hash className="w-3 h-3 mr-1" />
                        {subCategory.sub_cat_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(subCategory.category.cat_name)}`}>
                        <Folder className="w-3 h-3 mr-1" />
                        {subCategory.category.cat_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{subCategory._count.products}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(subCategory.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subCategory.updated_by_user?.full_name ? (
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white text-xs font-bold">
                              {subCategory.updated_by_user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {subCategory.updated_by_user.full_name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {subCategory.updated_by_user.role || 'User'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">N/A</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSubCategory(subCategory)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                          title="Edit Sub Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubCategory(subCategory.sub_cat_id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          title="Delete Sub Category"
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

        {/* Sub Category Modal */}
        {showSubCategoryForm && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background Overlay */}
              <div 
                className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-blue-900/60 to-purple-900/80 backdrop-blur-md transition-all duration-500 ease-out animate-fade-in" 
                onClick={() => setShowSubCategoryForm(false)}
              ></div>
              
              {/* Modal Container */}
              <div className="relative inline-block w-full max-w-md p-0 my-8 overflow-hidden text-left align-middle transition-all duration-500 ease-out transform bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 animate-slide-in-up">
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {editingSubCategory ? 'Edit Sub Category' : 'Add New Sub Category'}
                        </h3>
                        <p className="text-indigo-100 text-sm">
                          {editingSubCategory ? 'Update sub category information' : 'Create a new product sub category'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSubCategoryForm(false)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Category Selection */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Folder className="w-4 h-4 inline mr-2" />
                        Parent Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="cat_id"
                        value={formData.cat_id}
                        onChange={handleFormChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category.cat_id} value={category.cat_id}>
                            {category.cat_name} ({category.cat_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sub Category Name Field */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FolderOpen className="w-4 h-4 inline mr-2" />
                        Sub Category Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="sub_cat_name"
                        value={formData.sub_cat_name}
                        onChange={handleFormChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                        placeholder="Enter sub category name (e.g., Smartphones)"
                      />
                    </div>

                    {/* Sub Category Code Field */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Hash className="w-4 h-4 inline mr-2" />
                        Sub Category Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="sub_cat_code"
                          value={formData.sub_cat_code}
                          onChange={handleFormChange}
                          required
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter sub category code (e.g., SMARTPHONE001)"
                        />
                        <button
                          type="button"
                          onClick={handleAutoGenerateCode}
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors duration-200"
                          title="Auto Generate Code"
                        >
                          <Hash className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Sub category code must be unique. Click the # button to auto-generate.
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowSubCategoryForm(false)}
                        className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="group px-8 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <span className="flex items-center">
                          {editingSubCategory ? 'Update Sub Category' : 'Create Sub Category'}
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
