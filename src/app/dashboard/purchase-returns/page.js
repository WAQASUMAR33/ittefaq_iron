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
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  Fade,
  Zoom
} from '@mui/material';

import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Undo as UndoIcon,
  History as HistoryIcon,
  FilterList as FilterIcon,
  RestartAlt as ResetIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

// Premium Theme Patterns
const STYLES = {
  glassCard: {
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '24px',
    border: '1px solid rgba(224, 224, 224, 0.5)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      boxShadow: '0 15px 50px rgba(0,0,0,0.08)',
    }
  },
  gradientHeader: {
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    color: 'white',
    p: { xs: 3, md: 5 },
    borderRadius: '0 0 40px 40px',
    mb: -6,
    boxShadow: '0 10px 30px rgba(30, 41, 59, 0.2)',
    position: 'relative',
    zIndex: 1,
  },
  primaryGradientBtn: {
    background: 'linear-gradient(45deg, #6366f1 30%, #a855f7 90%)',
    borderRadius: '14px',
    px: 3,
    py: 1.2,
    fontSize: '0.9rem',
    fontWeight: '600',
    textTransform: 'none',
    color: 'white',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
    '&:hover': {
      background: 'linear-gradient(45deg, #4f46e5 30%, #9333ea 90%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
    },
    transition: 'all 0.2s',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    '& .MuiTableCell-head': {
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      letterSpacing: '0.05em',
      py: 2,
    }
  },
  input: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      '& fieldset': { border: '1px solid #e2e8f0' },
      '&:hover fieldset': { borderColor: '#cbd5e1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
    }
  }
};

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

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [returnsRes, purchasesRes, customersRes, productsRes, storesRes] = await Promise.all([
        fetch('/api/purchase-returns'),
        fetch('/api/purchases'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/stores')
      ]);

      const data = await Promise.all([
        returnsRes.json(),
        purchasesRes.json(),
        customersRes.json(),
        productsRes.json(),
        storesRes.json()
      ]);

      setPurchaseReturns(data[0] || []);
      setPurchases(data[1] || []);
      setCustomers(data[2] || []);
      setProducts(data[3] || []);

      const storesResponse = data[4];
      const storesData = storesResponse.success ? storesResponse.data : [];
      setStores(Array.isArray(storesData) ? storesData : []);

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
    showSnackbar(`Purchase #${purchase.pur_id} loaded successfully`, 'success');
  };

  // Handle purchase search
  const handlePurchaseSearch = async (e) => {
    e?.preventDefault();
    if (!purchaseSearchTerm.trim()) return;

    setIsSearchingPurchase(true);
    try {
      if (!isNaN(purchaseSearchTerm)) {
        const idRes = await fetch(`/api/purchases?id=${purchaseSearchTerm}`);
        if (idRes.ok) {
          const purchase = await idRes.json();
          handlePurchaseSelect(purchase);
          setIsSearchingPurchase(false);
          return;
        }
      }

      const invoiceRes = await fetch(`/api/purchases?invoice=${purchaseSearchTerm}`);
      if (invoiceRes.ok) {
        const purchase = await invoiceRes.json();
        handlePurchaseSelect(purchase);
      } else {
        showSnackbar('Purchase not found with that ID or Invoice', 'warning');
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
    const detail = formData.return_details[index];
    const newQuantity = Math.max(0, Math.min(quantity, detail.max_quantity));

    setFormData(prev => {
      const updatedDetails = prev.return_details.map((item, i) => {
        if (i === index) {
          const returnAmount = newQuantity * parseFloat(item.unit_rate || 0);
          return {
            ...item,
            return_quantity: newQuantity,
            return_amount: returnAmount
          };
        }
        return item;
      });

      const totalReturnAmount = updatedDetails.reduce((sum, item) => sum + (item.return_amount || 0), 0);

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
      const totalReturnAmount = updatedDetails.reduce((sum, item) => sum + (item.return_amount || 0), 0);

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
    if (window.confirm('Are you sure you want to delete this purchase return? This action will restore stock and reverse ledger entries.')) {
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

      const matchesSearch = (returnItem.return_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        returnItem.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer?.cus_name?.toLowerCase().includes(searchTerm.toLowerCase()));
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
        <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <CircularProgress size={60} thickness={4} sx={{ color: 'indigo.500' }} />
          <Typography variant="h6" color="text.secondary" className="animate-pulse">
            Fetching Purchase Returns...
          </Typography>
        </Box>
      </DashboardLayout>
    );
  }

  // Render Purchase Returns List View
  const renderPurchaseReturnsListView = () => (
    <DashboardLayout>
      <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', pb: 10 }}>
        {/* Modern Header */}
        <Box sx={STYLES.gradientHeader}>
          <Container maxWidth="xl">
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                    <ShoppingCartIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: '800', letterSpacing: '-0.02em', mb: 0.5 }}>
                      Purchase Returns
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: '500' }}>
                      Track returns to suppliers and maintain accurate stock levels
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCurrentView('create')}
                  sx={STYLES.primaryGradientBtn}
                >
                  Create New Return
                </Button>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ mt: 1 }}>
          <Stack spacing={4}>
            {/* Filter Section */}
            <Fade in={true} timeout={800}>
              <Card sx={STYLES.glassCard}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <FilterIcon sx={{ color: 'indigo.500' }} />
                    <Typography variant="h6" sx={{ fontWeight: '700' }}>Quick Filters</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" onClick={clearFilters} startIcon={<ResetIcon />}>Reset</Button>
                  </Stack>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        placeholder="Search by ID, Reason, Supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={STYLES.input}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: 'indigo.400' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Autocomplete
                        options={customers}
                        getOptionLabel={(option) => option.cus_name}
                        value={selectedCustomer}
                        onChange={(event, newValue) => setSelectedCustomer(newValue)}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Filter by Supplier" sx={STYLES.input} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        type="date"
                        label="From"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={STYLES.input}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        type="date"
                        label="To"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={STYLES.input}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Fade>

            {/* Table Section */}
            <Fade in={true} timeout={1100}>
              <Card sx={STYLES.glassCard}>
                <TableContainer>
                  <Table>
                    <TableHead sx={STYLES.tableHeader}>
                      <TableRow>
                        <TableCell>Return Details</TableCell>
                        <TableCell>Supplier</TableCell>
                        <TableCell>Original Purchase</TableCell>
                        <TableCell>Return Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAndSortedReturns.length > 0 ? (
                        filteredAndSortedReturns.map((returnItem) => {
                          const purchase = purchases.find(p => p.pur_id === returnItem.purchase_id);
                          const customer = customers.find(c => c.cus_id === purchase?.cus_id);
                          return (
                            <TableRow key={returnItem.id} hover>
                              <TableCell>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Box sx={{ p: 1, bgcolor: 'indigo.50', color: 'indigo.600', borderRadius: '10px' }}>
                                    <UndoIcon fontSize="small" />
                                  </Box>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: '700', color: 'indigo.700' }}>
                                      PUR-R-{returnItem.id}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                                      {returnItem.return_reason || 'Manual Return'}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: '600' }}>
                                  {customer?.cus_name || 'Generic Supplier'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {customer?.cus_phone_no || 'Internal Record'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={`#${returnItem.purchase_id}`} size="small" variant="outlined" sx={{ borderRadius: '6px' }} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(returnItem.return_date).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: '800', color: 'error.main' }}>
                                  PKR {parseFloat(returnItem.total_return_amount || 0).toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  <IconButton size="small" onClick={() => handleEdit(returnItem)} sx={{ color: 'indigo.600', bgcolor: 'indigo.50' }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDelete(returnItem.id)} sx={{ color: 'error.600', bgcolor: 'error.50' }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                            <Box sx={{ opacity: 0.3 }}>
                              <AssignmentIcon sx={{ fontSize: 60, mb: 1 }} />
                              <Typography variant="h6">No records found</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Fade>
          </Stack>
        </Container>
      </Box>
    </DashboardLayout>
  );

  // Render Purchase Return Create View
  const renderPurchaseReturnCreateView = () => (
    <DashboardLayout>
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 10 }}>
        {/* Form Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: 'white',
          py: 4,
          boxShadow: '0 10px 30px rgba(79, 70, 229, 0.2)'
        }}>
          <Container maxWidth="xl">
            <Stack direction="row" spacing={3} alignItems="center">
              <IconButton
                onClick={() => setCurrentView('list')}
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: '800' }}>
                  {editingReturn ? 'Update Purchase Return' : 'New Purchase Return'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Return items to supplier and update credits
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              {!editingReturn && (
                <Box sx={{ display: 'flex', alignItems: 'center', p: 0.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <TextField
                    placeholder="Purchase ID..."
                    size="small"
                    value={purchaseSearchTerm}
                    onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePurchaseSearch()}
                    sx={{ width: 150, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { border: 'none' } } }}
                  />
                  <Button variant="contained" onClick={handlePurchaseSearch} sx={{ bgcolor: 'white', color: 'indigo.700', borderRadius: '10px', fontWeight: 'bold' }}>
                    Load
                  </Button>
                </Box>
              )}
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ mt: -4 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {/* Master Data */}
              <Zoom in={true}>
                <Card sx={STYLES.glassCard}>
                  <CardContent sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Return Date"
                          type="date"
                          value={formData.return_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={STYLES.input}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Reason for Return"
                          value={formData.return_reason}
                          onChange={(e) => setFormData(prev => ({ ...prev, return_reason: e.target.value }))}
                          sx={STYLES.input}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        {selectedPurchase ? (
                          <Box sx={{ p: 2, bgcolor: 'indigo.50', borderRadius: '12px', border: '1px dashed #c7d2fe' }}>
                            <Typography variant="caption" color="indigo.700" fontWeight="bold">SOURCE PURCHASE</Typography>
                            <Typography variant="body1" fontWeight="700">#{selectedPurchase.pur_id} - Invoice: {selectedPurchase.invoice_number || 'N/A'}</Typography>
                          </Box>
                        ) : (
                          <Autocomplete
                            options={purchases}
                            getOptionLabel={(option) => `#${option.pur_id} - ${option.invoice_number || 'Purch'} - ${parseFloat(option.total_amount).toFixed(2)}`}
                            value={selectedPurchase}
                            onChange={(e, v) => v && handlePurchaseSelect(v)}
                            renderInput={(params) => <TextField {...params} label="Select Purchase Manually" sx={STYLES.input} />}
                          />
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Zoom>

              {/* Items Table */}
              <Zoom in={true} style={{ transitionDelay: '200ms' }}>
                <Card sx={STYLES.glassCard}>
                  <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="800">Return Items List</Typography>
                    <Typography variant="body2" color="text.secondary">Specify quantities to return</Typography>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead sx={STYLES.tableHeader}>
                        <TableRow>
                          <TableCell width="60">#</TableCell>
                          <TableCell>Product Description</TableCell>
                          <TableCell align="center">Purchase Qty</TableCell>
                          <TableCell align="right">Unit Rate</TableCell>
                          <TableCell align="center" width="140">Return Qty</TableCell>
                          <TableCell align="right">Return Value</TableCell>
                          <TableCell align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.return_details.length > 0 ? (
                          formData.return_details.map((detail, index) => {
                            const product = products.find(p => p.pro_id === detail.pro_id);
                            return (
                              <TableRow key={index} hover>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="700">{product?.pro_title || 'Product Meta Missing'}</Typography>
                                  <Typography variant="caption" color="text.secondary">{product?.pro_unit || 'Units'}</Typography>
                                </TableCell>
                                <TableCell align="center">{detail.max_quantity}</TableCell>
                                <TableCell align="right">{parseFloat(detail.unit_rate).toFixed(2)}</TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={detail.return_quantity}
                                    onChange={(e) => handleReturnQuantityChange(index, parseFloat(e.target.value) || 0)}
                                    inputProps={{ style: { textAlign: 'center', fontWeight: 'bold' } }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="800" color="primary.main">
                                    {(detail.return_amount || 0).toFixed(2)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton size="small" color="error" onClick={() => removeReturnDetail(index)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                              <Box sx={{ opacity: 0.2 }}>
                                <InventoryIcon sx={{ fontSize: 48, mb: 1 }} />
                                <Typography>Load a purchase to see items</Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ p: 4, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <Grid container spacing={4} alignItems="flex-end">
                      <Grid item xs={12} md={7}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Additional Comments (Internal)"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          sx={STYLES.input}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Typography variant="h6" fontWeight="700">Total Return Amount</Typography>
                            <Typography variant="h5" fontWeight="900" color="error.main">
                              PKR {formData.total_return_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            type="submit"
                            disabled={isSubmitting || formData.total_return_amount <= 0}
                            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            sx={{ ...STYLES.primaryGradientBtn, py: 2 }}
                          >
                            {isSubmitting ? 'Processing...' : (editingReturn ? 'Update Return Record' : 'Submit Return Record')}
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              </Zoom>
            </Stack>
          </form>
        </Container>
      </Box>
    </DashboardLayout>
  );

  return (
    <>
      <Fade in={true}>
        <Box>
          {currentView === 'list' ? renderPurchaseReturnsListView() : renderPurchaseReturnCreateView()}
        </Box>
      </Fade>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: '12px', fontWeight: 'bold' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}