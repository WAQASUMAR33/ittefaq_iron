'use client';

import { useState, useEffect, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  Chip,
  InputAdornment,
  Stack,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel
} from '@mui/material';

import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ArrowBack as ArrowBackIcon,
  ArrowLeft as ArrowLeftIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  ShoppingCart as ShoppingCartIcon,
  Undo as UndoIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function PurchaseReturnsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit'
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);

  // Purchase Search State
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [isSearchingPurchase, setIsSearchingPurchase] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form states
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [formData, setFormData] = useState({
    purchase_id: '',
    return_date: new Date().toISOString().split('T')[0],
    return_reason: '',
    return_details: [],
    total_return_amount: 0,
    notes: ''
  });

  // Product form states
  const [productFormData, setProductFormData] = useState({
    return_quantity: '0',
    return_amount: '0'
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [returnsRes, purchasesRes, customersRes, productsRes, storesRes] = await Promise.all([
        fetch('/api/purchase-returns'),
        fetch('/api/purchases'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/stores')
      ]);

      if (returnsRes.ok) {
        const returnsData = await returnsRes.json();
        setPurchaseReturns(returnsData);
      }
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
      if (storesRes.ok) {
        const storesResponse = await storesRes.json();
        const storesData = storesResponse.success ? storesResponse.data : [];
        setStores(Array.isArray(storesData) ? storesData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCustomer(null);
    setSelectedStore(null);
    setDateFrom('');
    setDateTo('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  // Handle purchase selection
  const handlePurchaseSelect = (purchase) => {
    setSelectedPurchase(purchase);
    setFormData(prev => ({
      ...prev,
      purchase_id: purchase.pur_id,
      return_details: purchase.purchase_details?.map(detail => ({
        ...detail,
        return_quantity: 0,
        return_amount: 0,
        max_quantity: detail.qnty || detail.quantity || 0
      })) || []
    }));
  };

  // Handle purchase search
  const handlePurchaseSearch = async (e) => {
    e?.preventDefault();
    if (!purchaseSearchTerm.trim()) return;
    
    setIsSearchingPurchase(true);
    try {
      // Try search by ID if numeric
      if (!isNaN(purchaseSearchTerm)) {
        const idRes = await fetch(`/api/purchases?id=${purchaseSearchTerm}`);
        if (idRes.ok) {
          const purchase = await idRes.json();
          handlePurchaseSelect(purchase);
          showSnackbar('Purchase loaded successfully', 'success');
          setIsSearchingPurchase(false);
          return;
        }
      }
      
      // Try search by Invoice Number
      const invoiceRes = await fetch(`/api/purchases?invoice=${purchaseSearchTerm}`);
      if (invoiceRes.ok) {
        const purchase = await invoiceRes.json();
        handlePurchaseSelect(purchase);
        showSnackbar('Purchase loaded successfully', 'success');
      } else {
        showSnackbar('Purchase not found with that ID or Invoice Number', 'error');
      }
    } catch (error) {
      console.error('Error searching purchase:', error);
      showSnackbar('Error searching purchase', 'error');
    } finally {
      setIsSearchingPurchase(false);
    }
  };

  // Handle return quantity change
  const handleReturnQuantityChange = (index, quantity) => {
    const newQuantity = Math.max(0, Math.min(quantity, formData.return_details[index].max_quantity));
    
    setFormData(prev => {
      const updatedDetails = prev.return_details.map((detail, i) => {
        if (i === index) {
          const returnAmount = newQuantity * parseFloat(detail.unit_rate || 0);
          return {
            ...detail,
            return_quantity: newQuantity,
            return_amount: returnAmount
          };
        }
        return detail;
      });

      const totalReturnAmount = updatedDetails.reduce((sum, detail) => sum + (detail.return_amount || 0), 0);

      return {
        ...prev,
        return_details: updatedDetails,
        total_return_amount: totalReturnAmount
      };
    });
  };

  // Remove return detail
  const removeReturnDetail = (index) => {
    setFormData(prev => {
      const updatedDetails = prev.return_details.filter((_, i) => i !== index);
      const totalReturnAmount = updatedDetails.reduce((sum, detail) => sum + (detail.return_amount || 0), 0);
      
      return {
        ...prev,
        return_details: updatedDetails,
        total_return_amount: totalReturnAmount
      };
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPurchase) {
      showSnackbar('Please select a purchase to return', 'error');
      return;
    }

    const returningItems = formData.return_details.filter(detail => detail.return_quantity > 0);
    if (returningItems.length === 0) {
      showSnackbar('Please select at least one item to return', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = '/api/purchase-returns';
      const method = editingReturn ? 'PUT' : 'POST';
      
      const body = editingReturn 
        ? { id: editingReturn.id, ...formData, return_details: returningItems }
        : { ...formData, return_details: returningItems };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingReturn(null);
        setSelectedPurchase(null);
        setFormData({
          purchase_id: '',
          return_date: new Date().toISOString().split('T')[0],
          return_reason: '',
          return_details: [],
          total_return_amount: 0,
          notes: ''
        });
        
        showSnackbar(
          editingReturn ? 'Purchase return updated successfully' : 'Purchase return created successfully',
          'success'
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        showSnackbar(
          errorData.message || `Error ${editingReturn ? 'updating' : 'creating'} purchase return`,
          'error'
        );
      }
    } catch (error) {
      console.error('Error saving purchase return:', error);
      showSnackbar('Error saving purchase return', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (purchaseReturn) => {
    setEditingReturn(purchaseReturn);
    const purchase = purchases.find(p => p.pur_id === purchaseReturn.purchase_id);
    if (purchase) {
      setSelectedPurchase(purchase);
    }
    setFormData({
      purchase_id: purchaseReturn.purchase_id,
      return_date: purchaseReturn.return_date.split('T')[0],
      return_reason: purchaseReturn.return_reason || '',
      return_details: purchaseReturn.return_details || [],
      total_return_amount: purchaseReturn.total_return_amount || 0,
      notes: purchaseReturn.notes || ''
    });
    setCurrentView('create');
  };

  // Handle delete
  const handleDelete = async (returnId) => {
    if (window.confirm('Are you sure you want to delete this purchase return?')) {
      try {
        const response = await fetch(`/api/purchase-returns?id=${returnId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
          showSnackbar('Purchase return deleted successfully', 'success');
        } else {
          showSnackbar('Error deleting purchase return', 'error');
        }
      } catch (error) {
        console.error('Error deleting purchase return:', error);
        showSnackbar('Error deleting purchase return', 'error');
      }
    }
  };

  // Filter and sort data
  const filteredAndSortedReturns = purchaseReturns
    .filter(returnItem => {
      const purchase = purchases.find(p => p.pur_id === returnItem.purchase_id);
      const customer = customers.find(c => c.cus_id === purchase?.cus_id);
      
      const matchesSearch = returnItem.return_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           returnItem.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer?.cus_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCustomer = !selectedCustomer || purchase?.cus_id === selectedCustomer.cus_id;
      const matchesStore = !selectedStore || purchase?.store_id === selectedStore.storeid;
      const matchesDateFrom = !dateFrom || new Date(returnItem.return_date) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(returnItem.return_date) <= new Date(dateTo);
      
      return matchesSearch && matchesCustomer && matchesStore && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      const modifier = sortOrder === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return -1 * modifier;
      if (aValue > bValue) return 1 * modifier;
      return 0;
    });

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

  // Render Purchase Returns List View
  const renderPurchaseReturnsListView = () => (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Purchase Returns Management
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage purchase returns, refunds, and inventory adjustments
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCurrentView('create')}
              sx={{
                background: 'linear-gradient(45deg, #4CAF50 30%, #2E7D32 90%)',
                boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388E3C 30%, #1B5E20 90%)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Add New Return
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
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search returns, customers, reasons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 300 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <Autocomplete
                    size="small"
                    options={customers}
                    getOptionLabel={(option) => option.cus_name}
                    value={selectedCustomer}
                    onChange={(event, newValue) => setSelectedCustomer(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="All Customers" />
                    )}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <Autocomplete
                    size="small"
                    options={stores}
                    getOptionLabel={(option) => option.store_name}
                    value={selectedStore}
                    onChange={(event, newValue) => setSelectedStore(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="All Stores" />
                    )}
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Returns Table */}
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
                Purchase Returns ({filteredAndSortedReturns.length})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Return ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Purchase ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Return Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Return Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedReturns.length > 0 ? (
                    filteredAndSortedReturns.map((returnItem) => {
                      const purchase = purchases.find(p => p.pur_id === returnItem.purchase_id);
                      const customer = customers.find(c => c.cus_id === purchase?.cus_id);
                      return (
                        <TableRow key={returnItem.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                              #{returnItem.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              #{returnItem.purchase_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {customer?.cus_name || 'Unknown Customer'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(returnItem.return_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'error.main' }}>
                              {parseFloat(returnItem.total_return_amount || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {returnItem.return_reason || 'No reason provided'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={returnItem.status || 'COMPLETED'} 
                              color="warning" 
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="Edit Return">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(returnItem)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Return">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(returnItem.id)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          No purchase returns found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      </Container>
    </DashboardLayout>
  );

  // Render Purchase Return Create View (matching purchase page exactly)
  const renderPurchaseReturnCreateView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('list')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeftIcon />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingReturn ? 'Edit Purchase Return' : 'Create New Purchase Return'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingReturn ? 'Update return information' : 'Select purchase and specify items to return'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header Section - Search Purchase */}
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Return # {editingReturn ? editingReturn.id : 'New'}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Purchase No or Invoice No"
                  value={purchaseSearchTerm}
                  onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                  sx={{ width: 250 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePurchaseSearch(e);
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handlePurchaseSearch}
                  disabled={isSearchingPurchase || !purchaseSearchTerm}
                  sx={{
                    bgcolor: 'secondary.main',
                    '&:hover': { bgcolor: 'secondary.dark' },
                    minWidth: 80
                  }}
                >
                  {isSearchingPurchase ? <CircularProgress size={20} color="inherit" /> : 'Q Find'}
                </Button>
              </Box>
            </Box>
          </Card>

          {/* Main Form */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Top Form Fields */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  {/* Row 1: Purchase Info (Read Only) */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Invoice No"
                      value={selectedPurchase?.invoice_no || ''}
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Purchase Date"
                      value={selectedPurchase ? new Date(selectedPurchase.purchase_date).toLocaleDateString() : ''}
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Supplier"
                      value={selectedPurchase ? (suppliers.find(s => s.sup_id === selectedPurchase.sup_id)?.sup_name || 'Unknown') : ''}
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                     <TextField
                      label="Vehicle No"
                      value={selectedPurchase?.vehicle_no || ''}
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>

                  {/* Row 2: Return Details */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Return Date"
                      type="date"
                      value={formData.return_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                   <Grid item xs={12} md={6}>
                    <TextField
                      label="Remarks / Reason"
                      value={formData.return_reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, return_reason: e.target.value }))}
                      size="small"
                      fullWidth
                      placeholder="Enter reason for return"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                     <Autocomplete
                        size="small"
                        options={purchases}
                        getOptionLabel={(option) => {
                          const customer = customers.find(c => c.cus_id === option.cus_id);
                          return `#${option.pur_id} - ${customer?.cus_name || 'Unknown'} - ${parseFloat(option.total_amount).toFixed(2)}`;
                        }}
                        value={selectedPurchase}
                        onChange={(event, newValue) => {
                          if (newValue) {
                            handlePurchaseSelect(newValue);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Manual Select"
                            placeholder="Select purchase..."
                          />
                        )}
                        disabled={editingReturn}
                      />
                  </Grid>
                </Grid>
              </Box>

              {/* Items Table */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                 <TableContainer sx={{ height: '100%' }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Product Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Store</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Original Qty</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Unit Rate</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Return Qty</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Return Amount</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedPurchase && formData.return_details.length > 0 ? (
                             formData.return_details.map((detail, index) => {
                                const product = products.find(p => p.pro_id === detail.pro_id);
                                const store = stores.find(s => s.storeid === detail.store_id);
                                return (
                                  <TableRow key={index} hover>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{product?.pro_title || 'Unknown'}</TableCell>
                                    <TableCell>{store?.store_name || 'Unknown'}</TableCell>
                                    <TableCell>{detail.max_quantity}</TableCell>
                                    <TableCell>{parseFloat(detail.unit_rate).toFixed(2)}</TableCell>
                                    <TableCell>
                                      <TextField
                                        type="number"
                                        size="small"
                                        value={detail.return_quantity || 0}
                                        onChange={(e) => handleReturnQuantityChange(index, parseInt(e.target.value) || 0)}
                                        inputProps={{ min: 0, max: detail.max_quantity, style: { padding: '4px 8px' } }}
                                        sx={{ width: 80 }}
                                      />
                                    </TableCell>
                                    <TableCell>{parseFloat(detail.return_amount).toFixed(2)}</TableCell>
                                    <TableCell>
                                      <IconButton size="small" color="error" onClick={() => removeReturnDetail(index)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                );
                             })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                {selectedPurchase ? 'No items available for return' : 'Please load a purchase to see items'}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                 </TableContainer>
              </Box>

              {/* Footer */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                     <TextField
                        fullWidth
                        size="small"
                        placeholder="Additional Notes..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                     />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                       <Typography variant="h6" color="error.main" fontWeight="bold">
                          Total: {parseFloat(formData.total_return_amount).toFixed(2)}
                       </Typography>
                       <Button
                          variant="contained"
                          color="primary"
                          type="submit"
                          disabled={isSubmitting || !selectedPurchase || formData.total_return_amount <= 0}
                       >
                          {isSubmitting ? 'Processing...' : 'Save Return'}
                       </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Card>
        </Box>
      </div>
    </DashboardLayout>
  );

  return (
    <>
      {currentView === 'list' ? renderPurchaseReturnsListView() : renderPurchaseReturnCreateView()}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}