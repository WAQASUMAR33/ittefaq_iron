'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/dashboard-layout';

// Material-UI imports
import { 
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Stack,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';

// Material Icons
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as PackageIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CheckCircle as CheckIcon,
  FilterList as FilterIcon,
  AttachMoney as DollarIcon,
  Numbers as HashIcon,
  CalendarToday as CalendarIcon,
  LocalOffer as TagIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  TrendingUp as TrendingUpIcon,
  Warning as AlertIcon,
  Star as StarIcon,
  Visibility as EyeIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';

export default function ProductsPage() {
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Quick action states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ cat_name: '' });
  const [subcategoryFormData, setSubcategoryFormData] = useState({ sub_cat_name: '', cat_id: '' });

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
      setSnackbar({
        open: true,
        message: 'Error fetching data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(sub => sub.cat_id === selectedCategory);
  };

  // Get subcategories for the form based on selected category in form
  const getFormSubcategories = () => {
    if (!formData.cat_id) return subcategories;
    return subcategories.filter(sub => sub.cat_id === formData.cat_id);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts(prev => [...prev, newProduct]);
        setShowProductForm(false);
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
        setSnackbar({
          open: true,
          message: 'Product added successfully!',
          severity: 'success'
        });
    } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.error || 'Failed to create product',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create product',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      pro_title: product.pro_title || '',
      pro_description: product.pro_description || '',
      pro_cost_price: product.pro_cost_price || '',
      pro_sale_price: product.pro_sale_price || '',
      pro_baser_price: product.pro_baser_price || '',
      pro_stock_qnty: product.pro_stock_qnty || '',
      pro_unit: product.pro_unit || '',
      pro_packing: product.pro_packing || '',
      cat_id: product.cat_id || '',
      sub_cat_id: product.sub_cat_id || ''
    });
    setShowProductForm(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingProduct.pro_id,
          ...formData
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(prev => prev.map(product => 
          product.pro_id === editingProduct.pro_id ? updatedProduct : product
        ));
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
        setSnackbar({
          open: true,
          message: 'Product updated successfully!',
          severity: 'success'
        });
    } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.error || 'Failed to update product',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update product',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/products?id=${productId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setProducts(prev => prev.filter(product => product.pro_id !== productId));
          setSnackbar({
            open: true,
            message: 'Product deleted successfully!',
            severity: 'success'
          });
    } else {
          const error = await response.json();
          setSnackbar({
            open: true,
            message: error.error || 'Failed to delete product',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete product',
          severity: 'error'
        });
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

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.pro_title.trim()) {
      setSnackbar({
        open: true,
        message: 'Product title is required',
        severity: 'error'
      });
      return;
    }

    if (!formData.cat_id) {
      setSnackbar({
        open: true,
        message: 'Please select a category',
        severity: 'error'
      });
      return;
    }

    if (editingProduct) {
      await handleUpdateProduct(e);
    } else {
      await handleAddProduct(e);
    }
  };

  const handleCloseDialog = () => {
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
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Quick action handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.cat_name.trim()) {
      setSnackbar({
        open: true,
        message: 'Category name is required',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });

      if (response.ok) {
        const newCategory = await response.json();
        setSnackbar({
          open: true,
          message: 'Category added successfully',
          severity: 'success'
        });
        setCategoryFormData({ cat_name: '' });
        setShowCategoryForm(false);
        // Update categories dropdown locally
        setCategories(prev => [...prev, newCategory]);
      } else {
        throw new Error('Failed to add category');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error adding category',
        severity: 'error'
      });
    }
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subcategoryFormData.sub_cat_name.trim() || !subcategoryFormData.cat_id) {
      setSnackbar({
        open: true,
        message: 'Subcategory name and category are required',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subcategoryFormData)
      });

        if (response.ok) {
        const newSubcategory = await response.json();
        setSnackbar({
          open: true,
          message: 'Subcategory added successfully',
          severity: 'success'
        });
        setSubcategoryFormData({ sub_cat_name: '', cat_id: '' });
        setShowSubcategoryForm(false);
        // Update subcategories dropdown locally
        setSubcategories(prev => [...prev, newSubcategory]);
      } else {
        throw new Error('Failed to add subcategory');
        }
      } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error adding subcategory',
        severity: 'error'
      });
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.pro_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.pro_description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.cat_id === selectedCategory;
      const matchesSubcategory = !selectedSubcategory || product.sub_cat_id === selectedSubcategory;
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = product.pro_stock_qnty < 10;
      } else if (stockFilter === 'out') {
        matchesStock = product.pro_stock_qnty <= 0;
      }
      
      return matchesSearch && matchesCategory && matchesSubcategory && matchesStock;
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
      if (sortBy === 'pro_cost_price' || sortBy === 'pro_sale_price' || sortBy === 'pro_stock_qnty') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    })
    .map((product, index) => ({
      ...product,
      sequentialId: index + 1
    }));

  // Calculate stats
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (parseFloat(product.pro_cost_price) * parseFloat(product.pro_stock_qnty) || 0), 0);
  const lowStockProducts = products.filter(product => product.pro_stock_qnty < 10).length;
  const outOfStockProducts = products.filter(product => product.pro_stock_qnty <= 0).length;

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSortBy('created_at');
    setSortOrder('desc');
    setStockFilter('all');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default'
          }}
        >
          <CircularProgress size={80} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Products Management
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage your product inventory, pricing, and stock levels
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowProductForm(true)}
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #7B1FA2 90%)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
                Add New Product
            </Button>
          </Box>

          {/* Filters */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 'semibold' }}>
                  Filters & Sorting
                </Typography>
                <Button
                  variant="text"
                  size="small"
                onClick={clearFilters}
                  sx={{ color: 'primary.main' }}
              >
                Clear All Filters
                </Button>
              </Box>
            
              <Grid container spacing={3}>
              {/* Search */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Search"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

              {/* Category Filter */}
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth sx={{ minWidth: 300 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                  value={selectedCategory}
                      label="Category"
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory('');
                  }}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map(category => (
                        <MenuItem key={category.cat_id} value={category.cat_id}>
                      {category.cat_name}
                        </MenuItem>
                  ))}
                    </Select>
                  </FormControl>
                </Grid>

              {/* Subcategory Filter */}
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth sx={{ minWidth: 300 }}>
                    <InputLabel>Subcategory</InputLabel>
                    <Select
                  value={selectedSubcategory}
                      label="Subcategory"
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                      disabled={!selectedCategory}
                    >
                      <MenuItem value="">All Subcategories</MenuItem>
                      {getFilteredSubcategories().map(subcategory => (
                        <MenuItem key={subcategory.sub_cat_id} value={subcategory.sub_cat_id}>
                      {subcategory.sub_cat_name}
                        </MenuItem>
                  ))}
                    </Select>
                  </FormControl>
                </Grid>

              {/* Stock Filter */}
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth sx={{ minWidth: 300 }}>
                    <InputLabel>Stock Status</InputLabel>
                    <Select
                  value={stockFilter}
                      label="Stock Status"
                  onChange={(e) => setStockFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="low">Low Stock</MenuItem>
                      <MenuItem value="out">Out of Stock</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Sort By */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ minWidth: 300 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort By"
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <MenuItem value="pro_title">Product Name</MenuItem>
                      <MenuItem value="pro_cost_price">Cost Price</MenuItem>
                      <MenuItem value="pro_sale_price">Sale Price</MenuItem>
                      <MenuItem value="pro_stock_qnty">Stock Quantity</MenuItem>
                      <MenuItem value="created_at">Created Date</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Sort Order */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ minWidth: 300 }}>
                    <InputLabel>Order</InputLabel>
                    <Select
                      value={sortOrder}
                      label="Order"
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <MenuItem value="asc">Ascending</MenuItem>
                      <MenuItem value="desc">Descending</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        mr: 2,
                        background: 'linear-gradient(45deg, #2196F3 30%, #00BCD4 90%)'
                      }}
                    >
                      <PackageIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Products
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalProducts}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        mr: 2,
                        background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
                      }}
                    >
                      <DollarIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Value
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalValue.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        mr: 2,
                        background: 'linear-gradient(45deg, #FF9800 30%, #F44336 90%)'
                      }}
                    >
                      <AlertIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Low Stock
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {lowStockProducts}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        mr: 2,
                        background: 'linear-gradient(45deg, #F44336 30%, #E91E63 90%)'
                      }}
                    >
                      <AlertIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Out of Stock
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {outOfStockProducts}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Products Table */}
          <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'semibold' }}>
                Products List
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredAndSortedProducts.length} of {products.length} products
              </Typography>
            </Box>
            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Cost Price</TableCell>
                    <TableCell>Sale Price</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedProducts.map((product) => (
                    <TableRow key={product.pro_id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {product.pro_title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.pro_description || 'No description'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip 
                            label={product.category?.cat_name || 'N/A'} 
                            color="primary" 
                            variant="outlined" 
                            size="small"
                            sx={{ mb: 0.5 }}
                          />
                          {product.subcategory && (
                            <Chip 
                              label={product.subcategory.sub_cat_name} 
                              color="secondary" 
                              variant="outlined" 
                              size="small"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {parseFloat(product.pro_cost_price || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {parseFloat(product.pro_sale_price || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.pro_stock_qnty} {product.pro_unit || 'units'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {product.pro_stock_qnty <= 0 ? (
                          <Chip label="Out of Stock" color="error" size="small" />
                        ) : product.pro_stock_qnty < 10 ? (
                          <Chip label="Low Stock" color="warning" size="small" />
                        ) : (
                          <Chip label="In Stock" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Edit Product">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditProduct(product)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Product">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteProduct(product.pro_id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Product Dialog */}
          <Dialog
            open={showProductForm}
            onClose={handleCloseDialog}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }
            }}
          >
            <DialogTitle
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    mr: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <PackageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {editingProduct ? 'Update product information' : 'Create a new product in your inventory'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={handleCloseDialog}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {/* Quick Action Buttons */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCategoryForm(true)}
                  sx={{
                    borderColor: '#2196F3',
                    color: '#2196F3',
                    '&:hover': {
                      borderColor: '#1976D2',
                      backgroundColor: 'rgba(33, 150, 243, 0.04)'
                    }
                  }}
                >
                  Add Category
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowSubcategoryForm(true)}
                  sx={{
                    borderColor: '#9C27B0',
                    color: '#9C27B0',
                    '&:hover': {
                      borderColor: '#7B1FA2',
                      backgroundColor: 'rgba(156, 39, 176, 0.04)'
                    }
                  }}
                >
                  Add Subcategory
                </Button>
              </Box>

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                    {/* Product Title */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Product Title"
                        name="pro_title"
                        value={formData.pro_title}
                      onChange={handleFormChange}
                        placeholder="Enter product title"
                        sx={{ minWidth: 250 }}
                      />
                  </Grid>

                    {/* Description */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                        name="pro_description"
                        value={formData.pro_description}
                      onChange={handleFormChange}
                        placeholder="Enter product description"
                      multiline
                      rows={3}
                        sx={{ minWidth: 250 }}
                    />
                  </Grid>

                  {/* Category */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required sx={{ minWidth: 250 }}>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.cat_id}
                        label="Category"
                        name="cat_id"
                        onChange={handleFormChange}
                      >
                        {categories.map(category => (
                          <MenuItem key={category.cat_id} value={category.cat_id}>
                            {category.cat_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Subcategory */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ minWidth: 250 }}>
                      <InputLabel>Subcategory</InputLabel>
                      <Select
                        value={formData.sub_cat_id}
                        label="Subcategory"
                        name="sub_cat_id"
                        onChange={handleFormChange}
                        disabled={!formData.cat_id}
                      >
                        {getFormSubcategories().map(subcategory => (
                          <MenuItem key={subcategory.sub_cat_id} value={subcategory.sub_cat_id}>
                            {subcategory.sub_cat_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                    {/* Cost Price */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Cost Price"
                        name="pro_cost_price"
                      type="number"
                      inputProps={{ step: "0.01" }}
                        value={formData.pro_cost_price}
                      onChange={handleFormChange}
                        placeholder="0.00"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"></InputAdornment>,
                      }}
                        sx={{ minWidth: 250 }}
                      />
                  </Grid>

                    {/* Sale Price */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Sale Price"
                        name="pro_sale_price"
                      type="number"
                      inputProps={{ step: "0.01" }}
                        value={formData.pro_sale_price}
                      onChange={handleFormChange}
                        placeholder="0.00"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"></InputAdornment>,
                      }}
                        sx={{ minWidth: 250 }}
                      />
                  </Grid>

                    {/* Base Price */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Base Price"
                        name="pro_baser_price"
                      type="number"
                      inputProps={{ step: "0.01" }}
                        value={formData.pro_baser_price}
                      onChange={handleFormChange}
                        placeholder="0.00"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"></InputAdornment>,
                      }}
                        sx={{ minWidth: 250 }}
                      />
                  </Grid>

                    {/* Stock Quantity */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Stock Quantity"
                        name="pro_stock_qnty"
                      type="number"
                        value={formData.pro_stock_qnty}
                      onChange={handleFormChange}
                        placeholder="0"
                        sx={{ minWidth: 250 }}
                      />
                  </Grid>

                    {/* Unit */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Unit"
                        name="pro_unit"
                        value={formData.pro_unit}
                      onChange={handleFormChange}
                        placeholder="e.g., pieces, kg, liters"
                        sx={{ minWidth: 250 }}
                      />
                  </Grid>

                    {/* Packing */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Packing"
                        name="pro_packing"
                        value={formData.pro_packing}
                      onChange={handleFormChange}
                      placeholder="Enter packing information"
                        sx={{ minWidth: 250 }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button
                onClick={handleCloseDialog}
                variant="outlined"
                sx={{ mr: 2 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #7B1FA2 90%)',
                  }
                }}
              >
                {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add Category Modal */}
          <Dialog
            open={showCategoryForm}
            onClose={() => setShowCategoryForm(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }
            }}
          >
            <DialogTitle
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #00BCD4 90%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    mr: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <PackageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    Add New Category
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Create a new product category
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={() => setShowCategoryForm(false)}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <Box component="form" onSubmit={handleAddCategory} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                        required
                  label="Category Name"
                  name="cat_name"
                  value={categoryFormData.cat_name}
                  onChange={(e) => setCategoryFormData({ cat_name: e.target.value })}
                  placeholder="Enter category name"
                  sx={{ mb: 3 }}
                />
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Button
                onClick={() => setShowCategoryForm(false)}
                variant="outlined"
                sx={{
                  borderColor: '#666',
                  color: '#666',
                  '&:hover': {
                    borderColor: '#333',
                    backgroundColor: 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCategory}
                variant="contained"
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #00BCD4 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #0097A7 90%)',
                  }
                }}
              >
                Add Category
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add Subcategory Modal */}
          <Dialog
            open={showSubcategoryForm}
            onClose={() => setShowSubcategoryForm(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }
            }}
          >
            <DialogTitle
              sx={{
                background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    mr: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <PackageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    Add New Subcategory
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Create a new product subcategory
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={() => setShowSubcategoryForm(false)}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <Box component="form" onSubmit={handleAddSubcategory} sx={{ mt: 2 }}>
                <FormControl fullWidth required sx={{ mb: 3, minWidth: 300 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={subcategoryFormData.cat_id}
                    label="Category"
                    onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, cat_id: e.target.value }))}
                  >
                    {categories.map(category => (
                      <MenuItem key={category.cat_id} value={category.cat_id}>
                        {category.cat_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  required
                  label="Subcategory Name"
                  name="sub_cat_name"
                  value={subcategoryFormData.sub_cat_name}
                  onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, sub_cat_name: e.target.value }))}
                  placeholder="Enter subcategory name"
                />
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Button
                onClick={() => setShowSubcategoryForm(false)}
                variant="outlined"
                sx={{
                  borderColor: '#666',
                  color: '#666',
                  '&:hover': {
                    borderColor: '#333',
                    backgroundColor: 'rgba(0,0,0,0.04)'
                  }
                }}
                    >
                      Cancel
              </Button>
              <Button
                onClick={handleAddSubcategory}
                variant="contained"
                sx={{
                  background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                  boxShadow: '0 3px 5px 2px rgba(156, 39, 176, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #7B1FA2 30%, #C2185B 90%)',
                  }
                }}
              >
                Add Subcategory
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={handleSnackbarClose}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Stack>
      </Container>
    </DashboardLayout>
  );
}