'use client';

import { useState, useEffect } from 'react';
import { Plus, Tag, Edit, Trash2, Check, Calendar, Users, X } from 'lucide-react';
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
  Fab,
  Tooltip,
  InputAdornment,
  Divider,
  Stack,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

// Material Icons
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Tag as TagIcon,
  CheckCircle as CheckIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';

export default function CustomerCategoryPage() {
  const [customerCategories, setCustomerCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    cus_cat_title: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load customer categories from API
  useEffect(() => {
    fetchCustomerCategories();
  }, []);

  const fetchCustomerCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer-category');
      if (response.ok) {
        const data = await response.json();
        setCustomerCategories(data);
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to fetch customer categories',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching customer categories:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching customer categories',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/customer-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCustomerCategories(prev => [...prev, newCategory]);
        setShowCategoryForm(false);
        setCategoryForm({ cus_cat_title: '' });
        setSnackbar({
          open: true,
          message: 'Customer category added successfully!',
          severity: 'success'
        });
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.error || 'Failed to create customer category',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating customer category:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create customer category',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      cus_cat_title: category.cus_cat_title
    });
    setShowCategoryForm(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/customer-category', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCategory.cus_cat_id,
          cus_cat_title: categoryForm.cus_cat_title
        }),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCustomerCategories(prev => prev.map(category => 
          category.cus_cat_id === editingCategory.cus_cat_id ? updatedCategory : category
        ));
        setShowCategoryForm(false);
        setEditingCategory(null);
        setCategoryForm({ cus_cat_title: '' });
        setSnackbar({
          open: true,
          message: 'Customer category updated successfully!',
          severity: 'success'
        });
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.error || 'Failed to update customer category',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating customer category:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update customer category',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await fetch(`/api/customer-category?id=${categoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCustomerCategories(prev => prev.filter(category => category.cus_cat_id !== categoryId));
          setSnackbar({
            open: true,
            message: 'Customer category deleted successfully!',
            severity: 'success'
          });
        } else {
          const error = await response.json();
          setSnackbar({
            open: true,
            message: error.error || 'Failed to delete customer category',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting customer category:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete customer category',
          severity: 'error'
        });
      }
    }
  };

  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!categoryForm.cus_cat_title.trim()) {
      setSnackbar({
        open: true,
        message: 'Category title is required',
        severity: 'error'
      });
      return;
    }
    
    console.log('Submitting category form:', categoryForm);
    
    if (editingCategory) {
      await handleUpdateCategory(e);
    } else {
      await handleAddCategory(e);
    }
  };

  const handleCloseDialog = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ cus_cat_title: '' });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Filter and sort categories
  const filteredAndSortedCategories = customerCategories
    .filter(category => 
      category.cus_cat_title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
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
  const totalCategories = customerCategories.length;
  const activeCategories = customerCategories.length; // All categories are considered active
  const recentAdditions = customerCategories.filter(cat => {
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
                Customer Categories
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage customer categories for better organization
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
          onClick={() => setShowCategoryForm(true)}
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
            Add New Category
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
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Search"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ minWidth: 300 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

          {/* Sort By */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth sx={{ minWidth: 300 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
              value={sortBy}
                      label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
                    >
                      <MenuItem value="cus_cat_title">Category Title</MenuItem>
                      <MenuItem value="created_at">Created Date</MenuItem>
                      <MenuItem value="updated_at">Updated Date</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

          {/* Sort Order */}
                <Grid item xs={12} md={4}>
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
                      <TagIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Categories
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalCategories}
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
                      <CheckIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Active Categories
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {activeCategories}
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
                        background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)'
                      }}
                    >
                      <CalendarIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Recent Additions
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {recentAdditions}
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
                      <PeopleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Categories Used
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalCategories}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

      {/* Categories Table */}
          <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'semibold' }}>
                Customer Categories
              </Typography>
              <Typography variant="body2" color="text.secondary">
            Showing {filteredAndSortedCategories.length} of {customerCategories.length} categories
              </Typography>
            </Box>
            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Category Title</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
              {filteredAndSortedCategories.map((category) => (
                    <TableRow key={category.cus_cat_id} hover>
                      <TableCell>
                        <Chip label={`#${category.sequentialId}`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {category.cus_cat_title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                    {new Date(category.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                    {new Date(category.updated_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Edit Category">
                            <IconButton
                              size="small"
                              color="primary"
                        onClick={() => handleEditCategory(category)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Category">
                            <IconButton
                              size="small"
                              color="error"
                        onClick={() => handleDeleteCategory(category.cus_cat_id)}
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

          {/* Category Dialog */}
          <Dialog
            open={showCategoryForm}
            onClose={handleCloseDialog}
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
                  <TagIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {editingCategory ? 'Update category information' : 'Create a new customer category'}
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
              <Box component="form" onSubmit={handleSubmitCategory} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  required
                  label="Category Title"
                      name="cus_cat_title"
                      value={categoryForm.cus_cat_title}
                      onChange={handleCategoryFormChange}
                      placeholder="Enter category title (e.g., VIP Customers)"
                  sx={{ mb: 3, minWidth: 300 }}
                />
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
                onClick={handleSubmitCategory}
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
                {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
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
