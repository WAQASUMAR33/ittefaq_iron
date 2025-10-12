'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Folder, Tag, Calendar, Package, Search, Hash } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    cat_name: '',
    cat_code: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load categories from API
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories(prev => [...prev, newCategory]);
        setShowCategoryForm(false);
        setFormData({
          cat_name: '',
          cat_code: ''
        });
        alert('Category added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      cat_name: category.cat_name || '',
      cat_code: category.cat_code || ''
    });
    setShowCategoryForm(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCategory.cat_id,
          cat_name: formData.cat_name,
          cat_code: formData.cat_code
        }),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories(prev => prev.map(category => 
          category.cat_id === editingCategory.cat_id ? updatedCategory : category
        ));
        setShowCategoryForm(false);
        setEditingCategory(null);
        setFormData({
          cat_name: '',
          cat_code: ''
        });
        alert('Category updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/categories?id=${categoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCategories(prev => prev.filter(category => category.cat_id !== categoryId));
          alert('Category deleted successfully!');
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete category');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
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

  const generateCategoryCode = (categoryName) => {
    const words = categoryName.split(' ');
    let code = '';
    
    if (words.length === 1) {
      code = words[0].substring(0, 4).toUpperCase();
    } else {
      code = words.map(word => word.charAt(0)).join('').toUpperCase();
    }
    
    // Add a number to make it unique
    const existingCodes = categories.map(cat => cat.cat_code);
    let counter = 1;
    let finalCode = code + String(counter).padStart(3, '0');
    
    while (existingCodes.includes(finalCode)) {
      counter++;
      finalCode = code + String(counter).padStart(3, '0');
    }
    
    return finalCode;
  };

  const handleAutoGenerateCode = () => {
    if (formData.cat_name && !formData.cat_code) {
      const generatedCode = generateCategoryCode(formData.cat_name);
      setFormData(prev => ({
        ...prev,
        cat_code: generatedCode
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.cat_name.trim()) {
      alert('Category name is required');
      return;
    }
    
    if (!formData.cat_code.trim()) {
      alert('Category code is required');
      return;
    }

    console.log('Submitting category form:', formData);

    if (editingCategory) {
      await handleUpdateCategory(e);
    } else {
      await handleAddCategory(e);
    }
  };

  // Filter and sort categories
  const filteredAndSortedCategories = categories
    .filter(category => 
      category.cat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.cat_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      
      // Handle special field mappings
      if (sortBy === 'product_count') {
        aValue = a._count?.products || 0;
        bValue = b._count?.products || 0;
      } else if (sortBy === 'sub_category_count') {
        aValue = a._count?.sub_categories || 0;
        bValue = b._count?.sub_categories || 0;
      } else {
        aValue = a[sortBy];
        bValue = b[sortBy];
      }
      
      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Handle numeric sorting
      if (sortBy === 'product_count' || sortBy === 'sub_category_count') {
        aValue = parseInt(aValue);
        bValue = parseInt(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    })
    .map((category, index) => ({
      ...category,
      sequentialId: index + 1
    }));

  // Calculate stats
  const totalCategories = categories.length;
  const totalProducts = categories.reduce((sum, cat) => sum + (cat._count?.products || 0), 0);
  const totalSubCategories = categories.reduce((sum, cat) => sum + (cat._count?.sub_categories || 0), 0);
  const recentAdditions = categories.filter(cat => {
    const createdDate = new Date(cat.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  }).length;

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('electronic')) return '⚡';
    if (name.includes('cloth') || name.includes('apparel')) return '👕';
    if (name.includes('home') || name.includes('garden')) return '🏠';
    if (name.includes('sport') || name.includes('fitness')) return '⚽';
    if (name.includes('book') || name.includes('media')) return '📚';
    return '📁';
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
            <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
            <p className="text-gray-600 mt-1">Organize your products with categories and subcategories</p>
          </div>
          <button
            onClick={() => setShowCategoryForm(true)}
            className="group bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <span className="flex items-center">
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
              Add New Category
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="cat_name">Category Name</option>
                <option value="cat_code">Category Code</option>
                <option value="product_count">Product Count</option>
                <option value="sub_category_count">Sub Category Count</option>
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
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900">{totalCategories}</p>
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
                <p className="text-sm font-medium text-gray-600">Sub Categories</p>
                <p className="text-2xl font-bold text-gray-900">{totalSubCategories}</p>
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

        {/* Categories Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Categories List</h3>
            <span className="text-sm text-gray-500">
              Showing {filteredAndSortedCategories.length} of {categories.length} categories
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Categories</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCategories.map((category) => (
                  <tr key={category.cat_id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                          <span className="text-white text-lg">{getCategoryIcon(category.cat_name)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{category.cat_name}</div>
                          <div className="text-sm text-gray-500">ID: #{category.sequentialId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Hash className="w-3 h-3 mr-1" />
                        {category.cat_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{category._count?.products || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Tag className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{category._count?.sub_categories || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {category.updated_by_user?.full_name ? (
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white text-xs font-bold">
                              {category.updated_by_user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {category.updated_by_user.full_name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {category.updated_by_user.role || 'User'}
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
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                          title="Edit Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.cat_id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          title="Delete Category"
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

        {/* Category Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background Overlay */}
              <div 
                className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-blue-900/60 to-purple-900/80 backdrop-blur-md transition-all duration-500 ease-out animate-fade-in" 
                onClick={() => setShowCategoryForm(false)}
              ></div>
              
              {/* Modal Container */}
              <div className="relative inline-block w-full max-w-md p-0 my-8 overflow-hidden text-left align-middle transition-all duration-500 ease-out transform bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 animate-slide-in-up">
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </h3>
                        <p className="text-blue-100 text-sm">
                          {editingCategory ? 'Update category information' : 'Create a new product category'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCategoryForm(false)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Category Name Field */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Folder className="w-4 h-4 inline mr-2" />
                        Category Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="cat_name"
                        value={formData.cat_name}
                        onChange={handleFormChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                        placeholder="Enter category name (e.g., Electronics)"
                      />
                    </div>

                    {/* Category Code Field */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Hash className="w-4 h-4 inline mr-2" />
                        Category Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="cat_code"
                          value={formData.cat_code}
                          onChange={handleFormChange}
                          required
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 text-black"
                          placeholder="Enter category code (e.g., ELEC001)"
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
                        Category code must be unique. Click the # button to auto-generate.
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowCategoryForm(false)}
                        className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="group px-8 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <span className="flex items-center">
                          {editingCategory ? 'Update Category' : 'Create Category'}
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
