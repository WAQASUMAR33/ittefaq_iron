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
  const [customerCategories, setCustomerCategories] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [journalStatus, setJournalStatus] = useState({ loading: false, error: null });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // This will be customer category ID
  const [selectedSubCategory, setSelectedSubCategory] = useState(''); // This will be customer type ID
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

  // Journal Form Data
  const [journalData, setJournalData] = useState({
    journal_date: new Date().toISOString().split('T')[0],
    journal_type: 'PAYMENT',
    reference: '',
    description: '',
  });

  const [journalLines, setJournalLines] = useState([
    { account_id: '', debit_amount: '', credit_amount: '', description: '', accountSearch: '' },
    { account_id: '', debit_amount: '', credit_amount: '', description: '', accountSearch: '' }
  ]);

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
      const [ledgerRes, customersRes, categoriesRes, typesRes] = await Promise.all([
        fetch('/api/ledger'),
        fetch('/api/customers'),
        fetch('/api/customer-category'),
        fetch('/api/customer-types')
      ]);

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setLedgerEntries(ledgerData);
      }
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCustomerCategories(categoriesData);
      }
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setCustomerTypes(typesData);
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
      entry.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer?.cus_phone_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer?.cus_phone_no2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer?.cus_reference?.toLowerCase().includes(searchTerm.toLowerCase());

    // Cascading filter logic for ledger entries
    const matchesCustomer = !selectedCustomer || entry.cus_id == selectedCustomer;
    const matchesCategory = !selectedCategory || entry.customer?.cus_category == selectedCategory;
    const matchesSubCategory = !selectedSubCategory || entry.customer?.cus_type == selectedSubCategory;

    return matchesSearch && matchesCustomer && matchesCategory && matchesSubCategory;
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
    const matchesCategory = !selectedCategory || customer.cus_category == selectedCategory;
    const matchesSubCategory = !selectedSubCategory || customer.cus_type == selectedSubCategory;

    if (!matchesCategory || !matchesSubCategory) return false;

    if (!accountSearchTerm) return true;
    const matchesSearch = customer.cus_name.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      customer.cus_phone_no?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      customer.cus_phone_no2?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      customer.cus_reference?.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      customer.cus_email?.toLowerCase().includes(accountSearchTerm.toLowerCase());
    return matchesSearch;
  });

  // Dynamic Sub-Category Filtering logic based on selected Category
  const availableSubCategories = customerTypes.filter(type => {
    if (!selectedCategory) return true;
    // Show only types that have customers in the selected category
    return customers.some(customer =>
      customer.cus_category == selectedCategory &&
      customer.cus_type == type.cus_type_id
    );
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

  const handleNewJournalEntry = () => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.cus_id === selectedCustomer);
      if (customer) {
        setJournalData({
          journal_date: new Date().toISOString().split('T')[0],
          journal_type: 'PAYMENT',
          reference: '',
          description: `Entry for ${customer.cus_name}`,
        });
        setJournalLines([
          { account_id: customer.cus_id, debit_amount: '', credit_amount: '', description: '', accountSearch: customer.cus_name },
          { account_id: '', debit_amount: '', credit_amount: '', description: '', accountSearch: '' }
        ]);
        setShowJournalForm(true);
      }
    }
  };

  const addJournalLine = () => {
    setJournalLines([...journalLines, { account_id: '', debit_amount: '', credit_amount: '', description: '', accountSearch: '' }]);
  };

  const removeJournalLine = (index) => {
    if (journalLines.length <= 2) return;
    setJournalLines(journalLines.filter((_, i) => i !== index));
  };

  const handleJournalLineChange = (index, field, value) => {
    const newLines = [...journalLines];
    newLines[index][field] = value;
    setJournalLines(newLines);
  };

  const handleJournalSubmit = async (e) => {
    e.preventDefault();

    // Validations
    const validLines = journalLines.filter(l => l.account_id && (parseFloat(l.debit_amount || 0) > 0 || parseFloat(l.credit_amount || 0) > 0));
    if (validLines.length < 2) {
      alert('A journal entry must have at least two lines with accounts and amounts.');
      return;
    }

    const totalDebits = validLines.reduce((sum, l) => sum + parseFloat(l.debit_amount || 0), 0);
    const totalCredits = validLines.reduce((sum, l) => sum + parseFloat(l.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      alert(`Totals are not balanced! Debit: ${totalDebits.toLocaleString()} | Credit: ${totalCredits.toLocaleString()}`);
      return;
    }

    try {
      setJournalStatus({ loading: true, error: null });
      const response = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...journalData,
          total_amount: totalDebits,
          journal_details: validLines.map(l => ({
            account_id: l.account_id,
            debit_amount: l.debit_amount || 0,
            credit_amount: l.credit_amount || 0,
            description: l.description || journalData.description
          })),
          created_by: 1 // TODO: Session
        })
      });

      if (response.ok) {
        setShowJournalForm(false);
        fetchData();
        alert('Journal Entry saved as DRAFT successfully.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save Journal Entry');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving journal entry');
    } finally {
      setJournalStatus({ loading: false, error: null });
    }
  };

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
    setSelectedSubCategory('');
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
                  Filters
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

              {/* Reordered Filters: Category → Sub-Category → Account → Search */}
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
                {/* Category Filter - FIRST */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      fullWidth
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubCategory(''); // Reset sub-category when category changes
                        setSelectedCustomer(''); // Reset account when category changes
                      }}
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
                      {customerCategories.map((cat) => (
                        <MenuItem key={cat.cus_cat_id} value={cat.cus_cat_id.toString()}>
                          {cat.cus_cat_title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Sub-Category Placeholder - SECOND */}
                <Box>
                  <FormControl fullWidth disabled={!selectedCategory}>
                    <InputLabel>Sub-Category</InputLabel>
                    <Select
                      fullWidth
                      value={selectedSubCategory}
                      onChange={(e) => {
                        setSelectedSubCategory(e.target.value);
                        setSelectedCustomer(''); // Reset account when sub-category changes
                      }}
                      label="Sub-Category"
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: selectedCategory ? 'white' : '#f9fafb',
                      }}
                    >
                      <MenuItem value="">All Sub-Categories</MenuItem>
                      {availableSubCategories.map((type) => (
                        <MenuItem key={type.cus_type_id} value={type.cus_type_id.toString()}>
                          {type.cus_type_title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Account Filter - THIRD */}
                <Box>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
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
                        onFocus={(e) => e.target.select()}
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

                {/* Search - FOURTH */}
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
            {/* Professional Ledger Header - Dynamic Account Name */}
            <CardHeader
              title={
                <Box sx={{ position: 'relative', textAlign: 'center', py: 2, bgcolor: 'white', color: 'black', mb: 0 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, letterSpacing: 1, color: 'black' }}>
                    GENERAL LEDGER
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#4b5563' }}>
                    {selectedCustomer
                      ? customers.find(c => c.cus_id === selectedCustomer)?.cus_name || 'ITEFAQ BUILDERS'
                      : 'ITEFAQ BUILDERS'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: '#6b7280' }}>
                    Accounting Period: {new Date().getFullYear()}
                  </Typography>

                  {/* Dynamic Shortcut Button */}
                  {selectedCustomer && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Plus size={16} />}
                      onClick={handleNewJournalEntry}
                      sx={{
                        position: 'absolute',
                        right: 24,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        color: 'white',
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 2,
                        py: 1,
                        borderRadius: 1.5,
                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                          boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                          transform: 'translateY(-50%) scale(1.05)',
                        },
                        transition: 'all 0.2s'
                      }}
                    >
                      New Journal Entry
                    </Button>
                  )}
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
                      <TableRow sx={{ bgcolor: '#1f2937', borderBottom: 2, borderColor: '#e5e7eb' }}>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: '#1f2937',
                            color: 'white',
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
                            bgcolor: '#1f2937',
                            color: 'white',
                            minWidth: 110,
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
                            bgcolor: '#1f2937',
                            color: 'white',
                            minWidth: 160,
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
                            bgcolor: '#1f2937',
                            color: 'white',
                            minWidth: 200,
                            letterSpacing: 0.5
                          }}
                        >
                          DESCRIPTION
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: '#1f2937',
                            color: 'white',
                            textAlign: 'right',
                            minWidth: 110,
                            letterSpacing: 0.5
                          }}
                        >
                          BANK (PKR)
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: '#1f2937',
                            color: 'white',
                            textAlign: 'right',
                            minWidth: 110,
                            letterSpacing: 0.5
                          }}
                        >
                          CASH (PKR)
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            bgcolor: '#1f2937',
                            color: 'white',
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
                      {finalLedgerEntries.map((entry, index) => {
                        // Determine if this is a debit (green) or credit (red) entry
                        const isDebit = parseFloat(entry.debit_amount) > 0;
                        const isCredit = parseFloat(entry.credit_amount) > 0;
                        const entryAmount = isDebit ? entry.debit_amount : entry.credit_amount;
                        
                        // Parse split payment info if present in details
                        let splitCashAmount = 0;
                        let splitBankAmount = 0;
                        let isSplitPayment = false;
                        
                        if (entry.details) {
                          // Extract split amounts from details field
                          // Format: "...| {cash_amount: X, bank_amount: Y}"
                          const splitMatch = entry.details.match(/\{\s*cash_amount:\s*([\d.]+),\s*bank_amount:\s*([\d.]+)\s*\}/);
                          if (splitMatch) {
                            splitCashAmount = parseFloat(splitMatch[1]);
                            splitBankAmount = parseFloat(splitMatch[2]);
                            isSplitPayment = true;
                          }
                        }
                        
                        // Determine Bank vs Cash based on transaction type or split info
                        let bankAmount = 0;
                        let cashAmount = 0;
                        
                        if (isSplitPayment) {
                          // Use parsed split amounts
                          bankAmount = splitBankAmount;
                          cashAmount = splitCashAmount;
                        } else if (entry.trnx_type === 'BANK_TRANSFER' || entry.trnx_type === 'CHEQUE') {
                          bankAmount = entryAmount;
                          cashAmount = 0;
                        } else if (entry.trnx_type === 'CASH') {
                          bankAmount = 0;
                          cashAmount = entryAmount;
                        }

                        // Color coding: Green for Debit, Red for Credit
                        const rowBgColor = isDebit ? '#dcfce7' : '#fee2e2';
                        const entryTypeColor = isDebit ? '#16a34a' : '#dc2626';

                        return (
                          <TableRow
                            key={entry.l_id}
                            sx={{
                              bgcolor: rowBgColor,
                              '&:hover': {
                                bgcolor: isDebit ? '#bbf7d0' : '#fecaca',
                                cursor: 'pointer',
                                '& .edit-icon': {
                                  opacity: 1
                                }
                              },
                              borderLeft: `4px solid ${entryTypeColor}`,
                              transition: 'all 0.2s'
                            }}
                            onDoubleClick={() => handleEdit(entry)}
                          >
                            {/* Serial Number */}
                            <TableCell
                              sx={{
                                borderRight: 1,
                                borderColor: 'divider',
                                textAlign: 'center',
                                fontWeight: 700,
                                bgcolor: rowBgColor
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
                                  bgcolor: entryTypeColor,
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: entryTypeColor
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
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                bgcolor: rowBgColor
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {new Date(entry.created_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </Typography>
                            </TableCell>

                            {/* Account Title */}
                            <TableCell
                              sx={{
                                borderRight: 1,
                                borderColor: 'divider',
                                bgcolor: rowBgColor,
                                fontWeight: 600
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1f2937' }}>
                                {entry.customer?.cus_name || 'Cash Account'}
                              </Typography>
                            </TableCell>

                            {/* Description */}
                            <TableCell
                              sx={{
                                borderRight: 1,
                                borderColor: 'divider',
                                maxWidth: 250,
                                bgcolor: rowBgColor
                              }}
                            >
                              <Typography variant="body2" sx={{ lineHeight: 1.4, fontWeight: 500, color: '#374151' }}>
                                {entry.details || 'General transaction'}
                              </Typography>
                              {entry.bill_no && (
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 0.5, color: entryTypeColor }}>
                                  Bill: {entry.bill_no}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Bank Amount */}
                            <TableCell
                              sx={{
                                borderRight: 1,
                                borderColor: 'divider',
                                textAlign: 'right',
                                bgcolor: rowBgColor,
                                fontWeight: 700
                              }}
                            >
                              {parseFloat(bankAmount) > 0 ? (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: entryTypeColor,
                                    fontFamily: 'monospace',
                                    fontSize: '0.95rem'
                                  }}
                                >
                                  {parseFloat(bankAmount).toLocaleString('en-PK', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 500 }}>
                                  -
                                </Typography>
                              )}
                            </TableCell>

                            {/* Cash Amount */}
                            <TableCell
                              sx={{
                                borderRight: 1,
                                borderColor: 'divider',
                                textAlign: 'right',
                                bgcolor: rowBgColor,
                                fontWeight: 700
                              }}
                            >
                              {parseFloat(cashAmount) > 0 ? (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: entryTypeColor,
                                    fontFamily: 'monospace',
                                    fontSize: '0.95rem'
                                  }}
                                >
                                  {parseFloat(cashAmount).toLocaleString('en-PK', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 500 }}>
                                  -
                                </Typography>
                              )}
                            </TableCell>

                            {/* Running Balance */}
                            <TableCell sx={{ textAlign: 'right', bgcolor: rowBgColor }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  color: parseFloat(entry.closing_balance) >= 0 ? '#16a34a' : '#dc2626',
                                  bgcolor: parseFloat(entry.closing_balance) >= 0 ? '#e0ffe0' : '#ffcccc',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.95rem'
                                }}
                              >
                                {parseFloat(entry.closing_balance).toLocaleString('en-PK', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ bgcolor: '#f9fafb', borderTop: 2, borderColor: '#374151' }}>
                        <TableCell colSpan={4} sx={{ borderRight: 1, borderColor: '#e5e7eb', bgcolor: '#1f2937' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', color: 'white' }}>
                            TOTAL SUMMARY
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderRight: 1, borderColor: '#e5e7eb', textAlign: 'right', bgcolor: '#f0f9ff' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'monospace', fontSize: '1rem' }}>
                            {finalLedgerEntries.reduce((sum, entry) => {
                              let amount = 0;
                              // Check for split payment in details first
                              if (entry.details) {
                                const splitMatch = entry.details.match(/\{\s*cash_amount:\s*([\d.]+),\s*bank_amount:\s*([\d.]+)\s*\}/);
                                if (splitMatch) {
                                  // This is a split payment, use bank amount
                                  amount = parseFloat(splitMatch[2]) || 0;
                                  return sum + amount;
                                }
                              }
                              // Otherwise use trnx_type logic
                              if (entry.trnx_type === 'BANK_TRANSFER' || entry.trnx_type === 'CHEQUE') {
                                amount = parseFloat(entry.debit_amount || 0) + parseFloat(entry.credit_amount || 0);
                              }
                              return sum + amount;
                            }, 0).toLocaleString('en-PK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderRight: 1, borderColor: '#e5e7eb', textAlign: 'right', bgcolor: '#fef2f2' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#dc2626', fontFamily: 'monospace', fontSize: '1rem' }}>
                            {finalLedgerEntries.reduce((sum, entry) => {
                              let amount = 0;
                              // Check for split payment in details first
                              if (entry.details) {
                                const splitMatch = entry.details.match(/\{\s*cash_amount:\s*([\d.]+),\s*bank_amount:\s*([\d.]+)\s*\}/);
                                if (splitMatch) {
                                  // This is a split payment, use cash amount
                                  amount = parseFloat(splitMatch[1]) || 0;
                                  return sum + amount;
                                }
                              }
                              // Otherwise use trnx_type logic
                              if (entry.trnx_type === 'CASH') {
                                amount = parseFloat(entry.debit_amount || 0) + parseFloat(entry.credit_amount || 0);
                              }
                              return sum + amount;
                            }, 0).toLocaleString('en-PK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', bgcolor: '#e0ffe0' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#111827', fontSize: '1rem' }}>
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
              autoSelect={true}
              autoHighlight={true}
              openOnFocus={true}
              selectOnFocus={true}
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
                  onFocus={(e) => e.target.select()}
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
      </Dialog>

      {/* Full General Journal Form Dialog */}
      <Dialog
        open={showJournalForm}
        onClose={() => setShowJournalForm(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 0 }
        }}
      >
        <DialogTitle sx={{
          pb: 2,
          pt: 3,
          px: 4,
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#f8fafc'
        }}>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#1e293b">General Journal Entry</Typography>
            <Typography variant="body2" color="#64748b">Record multi-line transactions across different accounts</Typography>
          </Box>
          <IconButton onClick={() => setShowJournalForm(false)} size="small" sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          <Box component="form" id="journal-form" onSubmit={handleJournalSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Journal Date"
                  type="date"
                  value={journalData.journal_date}
                  onChange={(e) => setJournalData({ ...journalData, journal_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={journalData.journal_type}
                    label="Type"
                    onChange={(e) => setJournalData({ ...journalData, journal_type: e.target.value })}
                  >
                    <MenuItem value="PAYMENT">Payment</MenuItem>
                    <MenuItem value="RECEIPT">Receipt</MenuItem>
                    <MenuItem value="TRANSFER">Transfer</MenuItem>
                    <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Reference / Bill #"
                  value={journalData.reference}
                  onChange={(e) => setJournalData({ ...journalData, reference: e.target.value })}
                  placeholder="Optional"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Description"
                  value={journalData.description}
                  onChange={(e) => setJournalData({ ...journalData, description: e.target.value })}
                />
              </Grid>
            </Grid>

            {/* Journal Lines */}
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center' }}>
              <Receipt size={18} style={{ marginRight: 8 }} /> Journal Details
            </Typography>

            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '35%' }}>Account</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '15%', textAlign: 'right' }}>Debit (PKR)</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '15%', textAlign: 'right' }}>Credit (PKR)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Line Description</TableCell>
                    <TableCell sx={{ width: '50px' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journalLines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Autocomplete
                          autoSelect={true}
                          autoHighlight={true}
                          openOnFocus={true}
                          selectOnFocus={true}
                          options={customers}
                          getOptionLabel={(option) => option.cus_name}
                          value={line.account_id ? customers.find(c => c.cus_id === line.account_id) : null}
                          onChange={(e, val) => {
                            handleJournalLineChange(index, 'account_id', val?.cus_id || '');
                            handleJournalLineChange(index, 'accountSearch', val?.cus_name || '');
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="standard"
                              placeholder="Search account..."
                              onFocus={(e) => e.target.select()}
                              InputProps={{ ...params.InputProps, disableUnderline: true }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.cus_id}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{option.cus_name}</Typography>
                                <Typography variant="caption" color="textSecondary">{option.customer_type?.cus_type_title}</Typography>
                              </Box>
                            </Box>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          variant="standard"
                          fullWidth
                          value={line.debit_amount}
                          onChange={(e) => handleJournalLineChange(index, 'debit_amount', e.target.value)}
                          InputProps={{ disableUnderline: true }}
                          sx={{ '& input': { textAlign: 'right', fontWeight: 600, color: '#dc2626' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          variant="standard"
                          fullWidth
                          value={line.credit_amount}
                          onChange={(e) => handleJournalLineChange(index, 'credit_amount', e.target.value)}
                          InputProps={{ disableUnderline: true }}
                          sx={{ '& input': { textAlign: 'right', fontWeight: 600, color: '#16a34a' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          variant="standard"
                          fullWidth
                          value={line.description}
                          onChange={(e) => handleJournalLineChange(index, 'description', e.target.value)}
                          placeholder="Optional"
                          InputProps={{ disableUnderline: true }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => removeJournalLine(index)}
                          disabled={journalLines.length <= 2}
                          color="error"
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                startIcon={<Plus size={16} />}
                onClick={addJournalLine}
                variant="outlined"
                size="small"
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Add Row
              </Button>

              <Box sx={{ display: 'flex', gap: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="#64748b" display="block">Total Debit</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="#dc2626">
                    {journalLines.reduce((sum, l) => sum + parseFloat(l.debit_amount || 0), 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="#64748b" display="block">Total Credit</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="#16a34a">
                    {journalLines.reduce((sum, l) => sum + parseFloat(l.credit_amount || 0), 0).toLocaleString()}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                  <Typography variant="caption" color="#64748b" display="block">Difference</Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    color={Math.abs(journalLines.reduce((sum, l) => sum + parseFloat(l.debit_amount || 0), 0) - journalLines.reduce((sum, l) => sum + parseFloat(l.credit_amount || 0), 0)) < 0.01 ? '#16a34a' : '#dc2626'}
                  >
                    {(journalLines.reduce((sum, l) => sum + parseFloat(l.debit_amount || 0), 0) - journalLines.reduce((sum, l) => sum + parseFloat(l.credit_amount || 0), 0)).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 4, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setShowJournalForm(false)} sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button
            form="journal-form"
            type="submit"
            variant="contained"
            disabled={journalStatus.loading}
            sx={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              textTransform: 'none',
              fontWeight: 700,
              px: 6,
              py: 1.5,
              borderRadius: 2,
              '&:hover': { background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }
            }}
          >
            {journalStatus.loading ? <CircularProgress size={24} color="inherit" /> : 'Post General Journal'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
