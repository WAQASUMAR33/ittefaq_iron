'use client';

import { useState, useEffect, Fragment } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Search,
  Filter,
  Hash,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  CreditCard,
  Banknote
} from 'lucide-react';
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
  Autocomplete,
  Divider,
  CardHeader,
  CardActions,
  TablePagination,
  Chip as MuiChip,
  LinearProgress
} from '@mui/material';

export default function FinancePage() {
  // State management
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('asc');

  // Customer dropdown filter states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    cus_id: '',
    debit_amount: '',
    credit_amount: '',
    bill_no: '',
    trnx_type: 'CASH',
    details: '',
    payments: '',
    bank_title: ''
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
      if (showAccountDropdown && !event.target.closest('.account-dropdown')) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown, showAccountDropdown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, customersRes] = await Promise.all([
        fetch('/api/ledger'),
        fetch('/api/customers')
      ]);

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setLedgerEntries(ledgerData);
      }
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredLedgerEntries = ledgerEntries.filter(entry => {
    const matchesSearch = entry.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.bill_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || entry.cus_id === selectedCustomer;
    const matchesCategory = !selectedCategory || entry.trnx_type === selectedCategory;

    return matchesSearch && matchesCustomer && matchesCategory;
  });

  // Customer filtering logic
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.cus_phone_no?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.cus_email?.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  // Account filtering logic for filter dropdown
  const filteredAccounts = customers.filter(customer => {
    if (!accountSearchTerm) return true; // Show all when no search term
    const matchesSearch = customer.cus_name.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      customer.cus_phone_no?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      customer.cus_email?.toLowerCase().includes(accountSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedLedgerEntries = filteredLedgerEntries.sort((a, b) => {
    let aValue, bValue;

    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'debit_amount') {
      aValue = parseFloat(a.debit_amount);
      bValue = parseFloat(b.debit_amount);
    } else if (sortBy === 'credit_amount') {
      aValue = parseFloat(a.credit_amount);
      bValue = parseFloat(b.credit_amount);
    } else if (sortBy === 'closing_balance') {
      aValue = parseFloat(a.closing_balance);
      bValue = parseFloat(b.closing_balance);
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

  const finalLedgerEntries = sortedLedgerEntries.map((entry, index) => ({
    ...entry,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.debit_amount), 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.credit_amount), 0);
  const totalPayments = ledgerEntries.reduce((sum, entry) => sum + parseFloat(entry.payments), 0);
  const currentBalance = ledgerEntries.length > 0 ? parseFloat(ledgerEntries[ledgerEntries.length - 1].closing_balance) : 0;

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, cus_id: customer.cus_id }));
    setCustomerSearchTerm(customer.cus_name);
    setShowCustomerDropdown(false);
  };

  const getSelectedCustomer = () => {
    return customers.find(customer => customer.cus_id === formData.cus_id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validation
      if (!formData.cus_id) {
        alert('Please select an account');
        return;
      }

      if (!formData.debit_amount && !formData.credit_amount) {
        alert('Please enter either debit or credit amount');
        return;
      }

      const url = editingLedger ? '/api/ledger' : '/api/ledger';
      const method = editingLedger ? 'PUT' : 'POST';

      const body = editingLedger
        ? {
          id: editingLedger.l_id,
          ...formData
        }
        : {
          ...formData
        };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setShowLedgerForm(false);
        setEditingLedger(null);
        setFormData({
          cus_id: '',
          debit_amount: '',
          credit_amount: '',
          bill_no: '',
          trnx_type: 'CASH',
          details: '',
          payments: '',
          bank_title: ''
        });
      }
    } catch (error) {
      console.error('Error saving ledger entry:', error);
    }
  };

  const handleEdit = (entry) => {
    setEditingLedger(entry);
    setFormData({
      cus_id: entry.cus_id,
      debit_amount: entry.debit_amount.toString(),
      credit_amount: entry.credit_amount.toString(),
      bill_no: entry.bill_no || '',
      trnx_type: entry.trnx_type,
      details: entry.details || '',
      payments: entry.payments.toString(),
      bank_title: entry.bank_title || ''
    });
    setCustomerSearchTerm(entry.customer?.cus_name || '');
    setShowLedgerForm(true);
  };

  // Handle delete all ledger entries
  const handleDeleteAllLedger = async (type) => {
    const typeNames = {
      purchase: 'PURCHASE',
      order: 'ORDER/SUBSCRIPTION',
      sales: 'SALES',
      all: 'ALL'
    };

    if (window.confirm(`Are you sure you want to delete all ${typeNames[type]} ledger entries? This action cannot be undone.`)) {
      try {
        const response = await fetch('/api/ledger/delete-all', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        });

        if (response.ok) {
          const data = await response.json();
          alert(`✅ ${data.message}\n\nDetails:\n${Object.entries(data.details).map(([k, v]) => `${k}: ${v}`).join('\n')}`);
          await fetchData();
        } else {
          alert('❌ Failed to delete ledger entries');
        }
      } catch (error) {
        console.error('Error deleting ledger entries:', error);
        alert('❌ Error: ' + error.message);
      }
    }
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this ledger entry?')) {
      try {
        const response = await fetch(`/api/ledger?id=${entryId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting ledger entry:', error);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('');
    setSelectedCategory('');
    setSortBy('created_at');
    setSortOrder('asc');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} />
          <Typography variant="body1" color="text.secondary">
            Loading ledger entries...
          </Typography>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth={false} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 3 }}>
        {/* Header Section */}
        <Box sx={{ flexShrink: 0, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Finance Management
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Manage customer ledger entries, payments, and financial records
              </Typography>
            </Box>
            <Box className="delete-btn-container" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Plus />}
                onClick={() => setShowLedgerForm(true)}
                sx={{
                  background: 'linear-gradient(45deg, #4caf50, #2e7d32)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #388e3c, #1b5e20)',
                  },
                  px: 3,
                  py: 1.5,
                  borderRadius: 0,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: 3,
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Add Ledger Entry
              </Button>

              {/* Delete Ledger Dropdown */}
              <Box sx={{ position: 'relative' }}>
                <Button
                  variant="contained"
                  startIcon={<Trash2 />}
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  sx={{
                    background: 'linear-gradient(45deg, #f44336, #d32f2f)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #da190b, #ba000d)',
                    },
                    px: 3,
                    py: 1.5,
                    borderRadius: 0,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: 3,
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    ml: 1
                  }}
                >
                  Delete Ledger
                </Button>

                {showDeleteMenu && (
                  <Box sx={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    mt: 1,
                    width: '250px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    boxShadow: 3,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <Button
                      fullWidth
                      onClick={() => {
                        handleDeleteAllLedger('purchase');
                        setShowDeleteMenu(false);
                      }}
                      sx={{
                        color: '#f44336',
                        justifyContent: 'flex-start',
                        pl: 2,
                        py: 1.5,
                        fontSize: '0.9rem',
                        borderRadius: 0,
                        textTransform: 'none',
                        '&:hover': {
                          background: '#ffebee'
                        }
                      }}
                    >
                      Delete Purchase Entries
                    </Button>
                    <Divider />
                    <Button
                      fullWidth
                      onClick={() => {
                        handleDeleteAllLedger('order');
                        setShowDeleteMenu(false);
                      }}
                      sx={{
                        color: '#f44336',
                        justifyContent: 'flex-start',
                        pl: 2,
                        py: 1.5,
                        fontSize: '0.9rem',
                        borderRadius: 0,
                        textTransform: 'none',
                        '&:hover': {
                          background: '#ffebee'
                        }
                      }}
                    >
                      Delete Order Entries
                    </Button>
                    <Divider />
                    <Button
                      fullWidth
                      onClick={() => {
                        handleDeleteAllLedger('sales');
                        setShowDeleteMenu(false);
                      }}
                      sx={{
                        color: '#f44336',
                        justifyContent: 'flex-start',
                        pl: 2,
                        py: 1.5,
                        fontSize: '0.9rem',
                        borderRadius: 0,
                        textTransform: 'none',
                        '&:hover': {
                          background: '#ffebee'
                        }
                      }}
                    >
                      Delete Sales Entries
                    </Button>
                    <Divider />
                    <Button
                      fullWidth
                      onClick={() => {
                        handleDeleteAllLedger('all');
                        setShowDeleteMenu(false);
                      }}
                      sx={{
                        color: '#d32f2f',
                        justifyContent: 'flex-start',
                        pl: 2,
                        py: 1.5,
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        borderRadius: 0,
                        textTransform: 'none',
                        '&:hover': {
                          background: '#ffcdd2'
                        }
                      }}
                    >
                      🗑️ Delete ALL Entries
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Filters Section */}
        <Box sx={{ flexShrink: 0, mb: 3, width: '100%' }}>
          <Card sx={{
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            width: '100%',
            border: '1px solid #e2e8f0',
            bgcolor: '#f8fafc'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
                  Filters & Sorting
                </Typography>
                <Button
                  onClick={clearFilters}
                  size="small"
                  sx={{
                    color: '#64748b',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { color: '#ef4444' }
                  }}
                >
                  Clear All Filters
                </Button>
              </Box>

              {/* Robust CSS Grid for Guaranteed Equal Widths */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  md: 'repeat(4, 1fr)'
                },
                gap: 3,
                width: '100%'
              }}>
                {/* Search */}
                {/* Search */}
                <Box>
                  <TextField
                    fullWidth
                    label="Search"
                    placeholder="Search ledger entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={18} color="#94a3b8" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'white',
                      }
                    }}
                  />
                </Box>

                {/* Category Filter */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      fullWidth
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      label="Category"
                      startAdornment={
                        <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                          <Filter size={18} color="#94a3b8" />
                        </InputAdornment>
                      }
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: 'white',
                      }}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="CHEQUE">Cheque</MenuItem>
                      <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Account Filter */}
                <Box>
                  <Autocomplete
                    fullWidth
                    options={filteredAccounts}
                    getOptionLabel={(option) => option.cus_name}
                    value={selectedCustomer ? customers.find(c => c.cus_id === selectedCustomer) : null}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        setSelectedCustomer(newValue.cus_id);
                        setAccountSearchTerm(newValue.cus_name);
                      } else {
                        setSelectedCustomer('');
                        setAccountSearchTerm('');
                      }
                    }}
                    inputValue={accountSearchTerm}
                    onInputChange={(event, newInputValue) => {
                      setAccountSearchTerm(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Account"
                        placeholder="Search accounts..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Fragment>
                              <InputAdornment position="start">
                                <Search size={18} color="#94a3b8" />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </Fragment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            bgcolor: 'white',
                          }
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <Box component="li" key={key} {...optionProps}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {option.cus_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {option.cus_phone_no} {option.cus_email && `• ${option.cus_email}`}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    noOptionsText="No accounts found"
                    clearOnEscape
                  />
                </Box>

                {/* Sort */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortBy(field);
                        setSortOrder(order);
                      }}
                      label="Sort By"
                      startAdornment={
                        <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                          <ArrowUp size={18} color="#94a3b8" />
                        </InputAdornment>
                      }
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: 'white',
                      }}
                    >
                      <MenuItem value="created_at-desc">Newest First</MenuItem>
                      <MenuItem value="created_at-asc">Oldest First</MenuItem>
                      <MenuItem value="customer-asc">Customer A-Z</MenuItem>
                      <MenuItem value="debit_amount-desc">Debit High-Low</MenuItem>
                      <MenuItem value="credit_amount-desc">Credit High-Low</MenuItem>
                      <MenuItem value="closing_balance-desc">Balance High-Low</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        {/* Unified Professional Stats Bar */}
        <Box sx={{ flexShrink: 0, mb: 3, width: '100%' }}>
          <Card sx={{
            borderRadius: 2,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            bgcolor: 'white',
            border: '1px solid #e5e7eb'
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'stretch',
              justifyContent: 'space-between',
              p: 0
            }}>
              {[
                { title: 'Total Debit', val: totalDebit, color: '#dc2626', bg: '#fef2f2', icon: <TrendingUp size={24} /> },
                { title: 'Total Credit', val: totalCredit, color: '#16a34a', bg: '#f0fdf4', icon: <TrendingDown size={24} /> },
                { title: 'Total Payments', val: totalPayments, color: '#2563eb', bg: '#eff6ff', icon: <DollarSign size={24} /> },
                { title: 'Current Balance', val: currentBalance, color: '#d97706', bg: '#fffbeb', icon: <Receipt size={24} /> }
              ].map((stat, i) => (
                <Fragment key={i}>
                  <Box sx={{
                    flex: 1,
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2.5,
                    width: '100%',
                    bgcolor: stat.bg,
                    position: 'relative',
                    borderBottom: i < 3 && { xs: '1px solid #e5e7eb', md: 'none' },
                    '&:hover': {
                      bgcolor: 'white',
                      transition: 'background-color 0.3s'
                    }
                  }}>
                    <Avatar sx={{
                      bgcolor: 'white',
                      color: stat.color,
                      width: 52,
                      height: 52,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      border: `1.5px solid ${stat.color}20`
                    }}>
                      {stat.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="overline" sx={{
                        display: 'block',
                        lineHeight: 1,
                        mb: 0.5,
                        color: '#6b7280',
                        fontWeight: 700,
                        letterSpacing: 1.2
                      }}>
                        {stat.title}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.5, color: stat.color }}>
                        <span style={{ fontSize: '0.8rem', marginRight: 4, opacity: 0.6 }}>PKR</span>
                        {stat.val.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  {i < 3 && (
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        bgcolor: '#e5e7eb',
                        height: 60,
                        my: 'auto'
                      }}
                    />
                  )}
                </Fragment>
              ))}
            </Box>
          </Card>
        </Box>

        {/* Professional Ledger Table */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <Card sx={{ borderRadius: 0, boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Professional Ledger Header */}
            <CardHeader
              title={
                <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'white', color: 'black', mb: 0 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, letterSpacing: 1, color: 'black' }}>
                    GENERAL LEDGER
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#4b5563' }}>
                    ITEFAQ BUILDERS
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: '#6b7280' }}>
                    Accounting Period: {new Date().getFullYear()}
                  </Typography>
                </Box>
              }
              sx={{
                borderBottom: 2,
                borderColor: '#e5e7eb',
                bgcolor: 'white',
                p: 0
              }}
            />

            {finalLedgerEntries.length === 0 ? (
              <Box sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}>
                <Receipt size={48} color="#9e9e9e" />
                <Typography variant="h6" color="text.secondary">
                  No ledger entries found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || selectedCustomer
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by adding your first ledger entry.'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <TableContainer sx={{ flex: 1 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'white', borderBottom: 2, borderColor: '#e5e7eb' }}>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: 'white',
                            color: 'black',
                            textAlign: 'center',
                            letterSpacing: 0.5
                          }}
                        >
                          S.NO
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: 'white',
                            color: 'black',
                            minWidth: 120,
                            letterSpacing: 0.5
                          }}
                        >
                          DATE
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: 'white',
                            color: 'black',
                            minWidth: 200,
                            letterSpacing: 0.5
                          }}
                        >
                          ACCOUNT TITLE
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: 'white',
                            color: 'black',
                            minWidth: 250,
                            letterSpacing: 0.5
                          }}
                        >
                          DESCRIPTION & DETAILS
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: 'white',
                            color: 'black',
                            textAlign: 'right',
                            minWidth: 120,
                            letterSpacing: 0.5
                          }}
                        >
                          DEBIT (PKR)
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: 'white',
                            color: 'black',
                            textAlign: 'right',
                            minWidth: 120,
                            letterSpacing: 0.5
                          }}
                        >
                          CREDIT (PKR)
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            bgcolor: 'white',
                            color: 'black',
                            textAlign: 'right',
                            minWidth: 120,
                            letterSpacing: 0.5
                          }}
                        >
                          BALANCE (PKR)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {finalLedgerEntries.map((entry, index) => (
                        <TableRow
                          key={entry.l_id}
                          sx={{
                            '&:hover': {
                              bgcolor: '#f5f5f5',
                              cursor: 'pointer',
                              '& .edit-icon': {
                                opacity: 1
                              }
                            },
                            '&:nth-of-type(even)': { bgcolor: '#fafafa' },
                            position: 'relative'
                          }}
                          onDoubleClick={() => handleEdit(entry)}
                        >
                          {/* Serial Number */}
                          <TableCell
                            sx={{
                              borderRight: 1,
                              borderColor: 'divider',
                              textAlign: 'center',
                              fontWeight: 500
                            }}
                          >
                            {index + 1}
                            <IconButton
                              size="small"
                              className="edit-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(entry);
                              }}
                              sx={{
                                position: 'absolute',
                                right: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'primary.dark'
                                }
                              }}
                            >
                              <Edit size={12} />
                            </IconButton>
                          </TableCell>

                          {/* Date */}
                          <TableCell
                            sx={{
                              borderRight: 1,
                              borderColor: 'divider',
                              fontFamily: 'monospace'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(entry.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(entry.created_at).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </TableCell>

                          {/* Account Title */}
                          <TableCell
                            sx={{
                              borderRight: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {entry.customer?.cus_name || 'Cash Account'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entry.customer?.cus_phone_no || 'General'}
                            </Typography>
                          </TableCell>

                          {/* Description */}
                          <TableCell
                            sx={{
                              borderRight: 1,
                              borderColor: 'divider',
                              maxWidth: 250,
                              bgcolor: index % 2 === 0 ? '#fafafa' : 'white'
                            }}
                          >
                            <Typography variant="body2" sx={{ lineHeight: 1.4, fontWeight: 500 }}>
                              {entry.details || 'General transaction'}
                            </Typography>
                            {entry.trnx_type === 'BANK_TRANSFER' && (
                              <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600, display: 'block', mt: 0.5 }}>
                                A/c: {entry.customer?.cus_name || 'Cash Account'} - {entry.bank_title || 'Standard'} Bank
                              </Typography>
                            )}
                            {entry.bill_no && (
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500, display: 'block', mt: 0.5 }}>
                                Bill No: {entry.bill_no}
                              </Typography>
                            )}
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={
                                  entry.trnx_type === 'CASH' ? 'CASH' :
                                    entry.trnx_type === 'BANK_TRANSFER' ? 'BANK TRANSFER' :
                                      entry.trnx_type === 'CHEQUE' ? 'CHEQUE' : entry.trnx_type
                                }
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  borderColor: entry.trnx_type === 'CASH' ? '#4caf50' :
                                    entry.trnx_type === 'BANK_TRANSFER' ? '#2196f3' :
                                      entry.trnx_type === 'CHEQUE' ? '#ff9800' : '#9e9e9e',
                                  color: entry.trnx_type === 'CASH' ? '#4caf50' :
                                    entry.trnx_type === 'BANK_TRANSFER' ? '#2196f3' :
                                      entry.trnx_type === 'CHEQUE' ? '#ff9800' : '#9e9e9e',
                                  bgcolor: 'white'
                                }}
                              />
                            </Box>
                          </TableCell>

                          {/* Debit Amount */}
                          <TableCell
                            sx={{
                              borderRight: 1,
                              borderColor: 'divider',
                              textAlign: 'right'
                            }}
                          >
                            {parseFloat(entry.debit_amount) > 0 ? (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f', fontFamily: 'monospace' }}>
                                {parseFloat(entry.debit_amount).toLocaleString('en-PK', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                -
                              </Typography>
                            )}
                          </TableCell>

                          {/* Credit Amount */}
                          <TableCell
                            sx={{
                              borderRight: 1,
                              borderColor: 'divider',
                              textAlign: 'right'
                            }}
                          >
                            {parseFloat(entry.credit_amount) > 0 ? (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32', fontFamily: 'monospace' }}>
                                {parseFloat(entry.credit_amount).toLocaleString('en-PK', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                -
                              </Typography>
                            )}
                          </TableCell>

                          {/* Running Balance */}
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                color: parseFloat(entry.closing_balance) >= 0 ? '#2e7d32' : '#d32f2f',
                                bgcolor: parseFloat(entry.closing_balance) >= 0 ? '#e8f5e8' : '#ffebee',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1
                              }}
                            >
                              {parseFloat(entry.closing_balance).toLocaleString('en-PK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {parseFloat(entry.closing_balance) >= 0 ? 'DR' : 'CR'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Summary Row */}
                      <TableRow sx={{ bgcolor: '#f9fafb', borderTop: 2, borderColor: '#374151' }}>
                        <TableCell colSpan={4} sx={{ borderRight: 1, borderColor: '#e5e7eb' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', color: '#111827' }}>
                            TOTAL SUMMARY
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderRight: 1, borderColor: '#e5e7eb', textAlign: 'right' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>
                            {totalDebit.toLocaleString('en-PK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderRight: 1, borderColor: '#e5e7eb', textAlign: 'right' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                            {totalCredit.toLocaleString('en-PK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#111827' }}>
                            {currentBalance.toLocaleString('en-PK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Showing {finalLedgerEntries.length} of {ledgerEntries.length} entries • Double-click any entry to edit
                  </Typography>
                </Box>
              </Box>
            )}
          </Card>
        </Box>
      </Container>

      {/* Ledger Form Modal */}
      <Dialog
        open={showLedgerForm}
        onClose={() => {
          setShowLedgerForm(false);
          setEditingLedger(null);
          setFormData({
            cus_id: '',
            debit_amount: '',
            credit_amount: '',
            bill_no: '',
            trnx_type: 'CASH',
            details: '',
            payments: ''
          });
          setCustomerSearchTerm('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2
        }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
            {editingLedger ? 'Edit Ledger Entry' : 'Add New Ledger Entry'}
          </Typography>
          <IconButton
            onClick={() => {
              setShowLedgerForm(false);
              setEditingLedger(null);
              setFormData({
                cus_id: '',
                debit_amount: '',
                credit_amount: '',
                bill_no: '',
                trnx_type: 'CASH',
                details: '',
                payments: ''
              });
              setCustomerSearchTerm('');
            }}
            sx={{ color: 'text.secondary' }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Account Selection */}
            <Autocomplete
              options={filteredCustomers}
              getOptionLabel={(option) => option.cus_name}
              value={formData.cus_id ? customers.find(c => c.cus_id === formData.cus_id) : null}
              onChange={(event, newValue) => {
                if (newValue) {
                  setFormData(prev => ({ ...prev, cus_id: newValue.cus_id }));
                  setCustomerSearchTerm(newValue.cus_name);
                } else {
                  setFormData(prev => ({ ...prev, cus_id: '' }));
                  setCustomerSearchTerm('');
                }
              }}
              inputValue={customerSearchTerm}
              onInputChange={(event, newInputValue) => {
                setCustomerSearchTerm(newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Account *"
                  placeholder="Search accounts..."
                  required
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={20} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    minWidth: 300,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    }
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box component="li" key={key} {...optionProps}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {option.cus_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.cus_phone_no} {option.cus_email && `• ${option.cus_email}`}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              noOptionsText="No accounts found"
              clearOnEscape
              clearText="Clear"
            />

            {/* Selected Customer Display */}
            {formData.cus_id && getSelectedCustomer() && (
              <Alert
                severity="success"
                action={
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, cus_id: '' }));
                      setCustomerSearchTerm('');
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <X size={16} />
                  </IconButton>
                }
              >
                <Typography variant="body2" fontWeight="medium">
                  {getSelectedCustomer().cus_name}
                </Typography>
                <Typography variant="caption">
                  {getSelectedCustomer().cus_phone_no} {getSelectedCustomer().cus_email && `• ${getSelectedCustomer().cus_email}`}
                </Typography>
              </Alert>
            )}

            {/* Amount Fields */}
            <Grid container spacing={3}>
              {/* Debit Amount */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Debit Amount"
                  name="debit_amount"
                  type="number"
                  value={formData.debit_amount}
                  onChange={handleInputChange}
                  inputProps={{ step: 0.01, min: 0 }}
                  placeholder="0.00"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: 'error.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                    }
                  }}
                />
              </Grid>

              {/* Credit Amount */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Credit Amount"
                  name="credit_amount"
                  type="number"
                  value={formData.credit_amount}
                  onChange={handleInputChange}
                  inputProps={{ step: 0.01, min: 0 }}
                  placeholder="0.00"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: 'success.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'success.main',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Transaction Type and Bill No */}
            <Grid container spacing={3}>
              {/* Transaction Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Transaction Type</InputLabel>
                  <Select
                    name="trnx_type"
                    value={formData.trnx_type}
                    onChange={handleInputChange}
                    label="Transaction Type"
                    sx={{
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: 1.5,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 2,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 2,
                      }
                    }}
                  >
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="CHEQUE">Cheque</MenuItem>
                    <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Bill No */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bill Number"
                  name="bill_no"
                  value={formData.bill_no}
                  onChange={handleInputChange}
                  placeholder="Enter bill number"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Bank Name Field - Show only for Bank Transfer */}
            {formData.trnx_type === 'BANK_TRANSFER' && (
              <TextField
                fullWidth
                label="Bank Name *"
                name="bank_title"
                value={formData.bank_title}
                onChange={handleInputChange}
                placeholder="Enter bank name (e.g., HBL, UBL, MCB)"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                  }
                }}
              />
            )}

            {/* Details */}
            <TextField
              fullWidth
              label="Details"
              name="details"
              value={formData.details}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="Enter transaction details"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  minHeight: 100,
                },
                '& .MuiInputLabel-root': {
                  fontWeight: 600,
                }
              }}
            />

            {/* Payments */}
            <TextField
              fullWidth
              label="Payments"
              name="payments"
              type="number"
              value={formData.payments}
              onChange={handleInputChange}
              inputProps={{ step: 0.01, min: 0 }}
              placeholder="0.00"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                },
                '& .MuiInputLabel-root': {
                  fontWeight: 600,
                }
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => {
              setShowLedgerForm(false);
              setEditingLedger(null);
              setFormData({
                cus_id: '',
                debit_amount: '',
                credit_amount: '',
                bill_no: '',
                trnx_type: 'CASH',
                details: '',
                payments: ''
              });
              setCustomerSearchTerm('');
            }}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            onClick={handleSubmit}
            sx={{
              background: 'linear-gradient(45deg, #2196f3, #9c27b0)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2, #7b1fa2)',
              },
              px: 4,
              py: 1.5,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 3,
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {editingLedger ? 'Update Entry' : 'Create Entry'}
          </Button>
        </DialogActions>
      </Dialog >
    </DashboardLayout >
  );
}
