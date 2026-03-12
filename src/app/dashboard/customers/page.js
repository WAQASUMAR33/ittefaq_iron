'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
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
  Alert,
  CircularProgress,
  Fab,
  Tooltip,
  InputAdornment,
  Divider,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CreditCard as CreditCardIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { Plus, Edit, Trash2, Check, X, Phone, Mail, MapPin, User, Building, CreditCard, Calendar, Search, Loader2, Users, TrendingUp, TrendingDown, Wallet, DollarSign, Filter, ArrowUp } from 'lucide-react';
import { Fragment } from 'react';
import DashboardLayout from '../components/dashboard-layout';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    cus_name: '',
    cus_phone_no: '',
    cus_phone_no2: '',
    cus_address: '',
    cus_reference: '',
    cus_account_info: '',
    other: '',
    cus_type: '',
    cus_category: '',
    cus_balance: 0,
    CNIC: '',
    NTN_NO: '',
    name_urdu: '',
    city_id: ''
  });

  // Popup states
  const [showCustomerTypePopup, setShowCustomerTypePopup] = useState(false);
  const [showCustomerCategoryPopup, setShowCustomerCategoryPopup] = useState(false);
  const [showCityPopup, setShowCityPopup] = useState(false);
  const [customerTypeFormData, setCustomerTypeFormData] = useState({ cus_type_title: '' });
  const [customerCategoryFormData, setCustomerCategoryFormData] = useState({ cus_cat_title: '' });
  const [cityFormData, setCityFormData] = useState({ city_name: '' });

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCustomerType, setIsAddingCustomerType] = useState(false);
  const [isAddingCustomerCategory, setIsAddingCustomerCategory] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');

  // Snackbar states
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Filterable dropdown states
  const [customerTypeSearch, setCustomerTypeSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Load data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, categoriesRes, customerTypesRes, citiesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/customer-category'),
        fetch('/api/customer-types'),
        fetch('/api/cities')
      ]);

      if (customersRes.ok && categoriesRes.ok && customerTypesRes.ok && citiesRes.ok) {
        const customersData = await customersRes.json();
        const categoriesData = await categoriesRes.json();
        const customerTypesData = await customerTypesRes.json();
        const citiesData = await citiesRes.json();

        setCustomers(customersData);
        setCustomerCategories(categoriesData);
        setCustomerTypes(customerTypesData);
        setCities(citiesData);
      } else {
        console.error('Failed to fetch data');
        setSnackbar({
          open: true,
          message: 'Failed to fetch data',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };


  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers(prev => [...prev, newCustomer]);
        setShowCustomerForm(false);
        setFormData({
          cus_name: '',
          cus_phone_no: '',
          cus_phone_no2: '',
          cus_address: '',
          cus_reference: '',
          cus_account_info: '',
          other: '',
          cus_type: '',
          cus_category: '',
          cus_balance: 0,
          CNIC: '',
          NTN_NO: '',
          name_urdu: '',
          city_id: ''
        });
        alert('Account added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create Account');
      }
    } catch (error) {
      console.error('Error creating Account:', error);
      alert('Failed to create Account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      cus_name: customer.cus_name || '',
      cus_phone_no: customer.cus_phone_no || '',
      cus_phone_no2: customer.cus_phone_no2 || '',
      cus_address: customer.cus_address || '',
      cus_reference: customer.cus_reference || '',
      cus_account_info: customer.cus_account_info || '',
      other: customer.other || '',
      cus_type: customer.cus_type || '',
      cus_category: customer.cus_category || '',
      cus_balance: customer.cus_balance || 0,
      CNIC: customer.CNIC || '',
      NTN_NO: customer.NTN_NO || '',
      name_urdu: customer.name_urdu || '',
      city_id: customer.city_id || ''
    });
    setShowCustomerForm(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCustomer.cus_id,
          ...formData
        }),
      });

      if (response.ok) {
        const updatedCustomer = await response.json();
        setCustomers(prev => prev.map(customer =>
          customer.cus_id === editingCustomer.cus_id ? updatedCustomer : customer
        ));
        setShowCustomerForm(false);
        setEditingCustomer(null);
        setFormData({
          cus_name: '',
          cus_phone_no: '',
          cus_phone_no2: '',
          cus_address: '',
          cus_reference: '',
          cus_account_info: '',
          other: '',
          cus_type: '',
          cus_category: '',
          cus_balance: 0,
          CNIC: '',
          NTN_NO: '',
          name_urdu: '',
          city_id: ''
        });
        alert('Account updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update Account');
      }
    } catch (error) {
      console.error('Error updating Account:', error);
      alert('Failed to update Account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this Account?')) {
      try {
        const response = await fetch(`/api/customers?id=${customerId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCustomers(prev => prev.filter(customer => customer.cus_id !== customerId));
          alert('Account deleted successfully!');
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete Account');
        }
      } catch (error) {
        console.error('Error deleting Account:', error);
        alert('Failed to delete Account');
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

  // Customer Type handlers
  const handleAddCustomerType = async (e) => {
    e.preventDefault();
    setIsAddingCustomerType(true);
    try {
      const response = await fetch('/api/customer-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerTypeFormData)
      });

      if (response.ok) {
        const newCustomerType = await response.json();
        setCustomerTypes(prev => [...prev, newCustomerType]);
        setShowCustomerTypePopup(false);
        setCustomerTypeFormData({ cus_type_title: '' });
        alert('Account type added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create Account type');
      }
    } catch (error) {
      console.error('Error creating Account type:', error);
      alert('Failed to create Account type');
    } finally {
      setIsAddingCustomerType(false);
    }
  };

  // Customer Category handlers
  const handleAddCustomerCategory = async (e) => {
    e.preventDefault();
    setIsAddingCustomerCategory(true);
    try {
      const response = await fetch('/api/customer-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerCategoryFormData)
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCustomerCategories(prev => [...prev, newCategory]);
        setShowCustomerCategoryPopup(false);
        setCustomerCategoryFormData({ cus_cat_title: '' });
        alert('Account category added successfully!');
      } else {
        alert('Failed to add account category');
      }
    } catch (error) {
      console.error('Error adding account category:', error);
      alert('Error adding account category');
    } finally {
      setIsAddingCustomerCategory(false);
    }
  };

  // City handlers
  const handleAddCity = async (e) => {
    e.preventDefault();
    // Client-side duplicate check (case-insensitive)
    const name = (cityFormData.city_name || '').trim().toLowerCase();
    if (!name) return alert('City name is required');
    const exists = cities.some(c => (c.city_name || '').trim().toLowerCase() === name);
    if (exists) return alert('City with this name already exists');

    setIsAddingCity(true);
    try {
      const response = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityFormData)
      });

      if (response.ok) {
        const newCity = await response.json();
        setCities(prev => [...prev, newCity]);
        setShowCityPopup(false);
        setCityFormData({ city_name: '' });
        alert('City added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create city');
      }
    } catch (error) {
      console.error('Error creating city:', error);
      alert('Failed to create city');
    } finally {
      setIsAddingCity(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.cus_name.trim()) {
      alert('Account name is required');
      return;
    }
    if (!formData.cus_phone_no.trim()) {
      alert('Phone number is required');
      return;
    }
    if (!formData.cus_address.trim()) {
      alert('Address is required');
      return;
    }
    if (!formData.cus_category) {
      alert('Account category is required');
      return;
    }

    if (editingCustomer) {
      await handleUpdateCustomer(e);
    } else {
      await handleAddCustomer(e);
    }
  };

  // Filter customers based on search and filter criteria
  const filteredCustomers = customers
    .filter(customer => {
      const q = searchTerm.toLowerCase();
      const city = cities.find(c => c.city_id === customer.city_id);
      const matchesSearch = !q ||
        (customer.cus_name || '').toLowerCase().includes(q) ||
        (customer.cus_phone_no || '').toLowerCase().includes(q) ||
        (customer.cus_phone_no2 || '').toLowerCase().includes(q) ||
        (customer.cus_address || '').toLowerCase().includes(q) ||
        (customer.cus_reference || '').toLowerCase().includes(q) ||
        (city?.city_name || '').toLowerCase().includes(q);

      const matchesType = typeFilter === 'all' || customer.cus_type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || customer.customer_category?.cus_cat_title === categoryFilter;

      let matchesBalance = true;
      if (balanceFilter === 'positive') {
        matchesBalance = parseFloat(customer.cus_balance) > 0;
      } else if (balanceFilter === 'negative') {
        matchesBalance = parseFloat(customer.cus_balance) < 0;
      } else if (balanceFilter === 'zero') {
        matchesBalance = parseFloat(customer.cus_balance) === 0;
      }

      return matchesSearch && matchesType && matchesCategory && matchesBalance;
    })
    .map((customer, index) => ({
      ...customer,
      sequentialId: index + 1
    }));

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setBalanceFilter('all');
  };

  // Stats Calculations
  const totalCustomers = filteredCustomers.length;
  const totalReceivables = filteredCustomers
    .filter(c => parseFloat(c.cus_balance) > 0)
    .reduce((sum, c) => sum + parseFloat(c.cus_balance), 0);
  const totalPayables = Math.abs(filteredCustomers
    .filter(c => parseFloat(c.cus_balance) < 0)
    .reduce((sum, c) => sum + parseFloat(c.cus_balance), 0));
  const netBalance = filteredCustomers.reduce((sum, c) => sum + parseFloat(c.cus_balance), 0);

  const getTypeColor = (type) => {
    switch (type) {
      case 'CASH_ACCOUNT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCOUNT_PAYABLE':
        return 'bg-red-100 text-red-800';
      case 'ACCOUNT_RECEIVABLE':
        return 'bg-emerald-100 text-emerald-800';
      case 'EXPENSE_ACCOUNT':
        return 'bg-orange-100 text-orange-800';
      case 'ASSET_ACCOUNT':
        return 'bg-indigo-100 text-indigo-800';
      case 'LIABILITY_ACCOUNT':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBalanceColor = (balance) => {
    const bal = parseFloat(balance);
    if (bal > 0) return 'text-green-600';
    if (bal < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Get customer type title from ID
  const getCustomerTypeTitle = (typeId) => {
    const customerType = customerTypes.find(type => type.cus_type_id === typeId);
    return customerType ? customerType.cus_type_title : typeId || 'Unknown';
  };

  // Get unique categories for filter dropdown
  const categories = [...new Set(customers.map(c => c.customer_category?.cus_cat_title || c.cus_category))];

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
      <div className="space-y-6 w-full p-4 md:p-6 lg:p-8">
        {/* Header with prominent animated New Account button at far left */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="contained"
              onClick={() => setShowCustomerForm(true)}
              startIcon={<AddIcon />}
              className="blink-button-strong"
              sx={{
                bgcolor: '#e02424',
                color: '#fff',
                '&:hover': { bgcolor: '#e02424', transform: 'scale(1.03)', boxShadow: '0 20px 40px rgba(224,36,36,0.20)' },
                px: 6,
                py: 2.25,
                minWidth: 220,
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '1.125rem',
                letterSpacing: '0.02em',
                boxShadow: '0 14px 36px rgba(0,0,0,0.26)',
                transition: 'transform 160ms cubic-bezier(.2,.9,.2,1), box-shadow 160ms ease',
                position: 'relative',
                overflow: 'visible'
              }}
              aria-label="Create new account"
            >
              New Account
            </Button>

            {/* removed redundant 'Accounts' title per request */}
          </div>

          {/* right side kept minimal for balance/stats */}
          <div />
        </div>


        {/* Premium Filters Section */}
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
                <Box>
                  <TextField
                    fullWidth
                    label="Search"
                    placeholder="Search by name, phone, address, city, reference..."
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

                {/* Type Filter */}
                <Box>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'CASH_ACCOUNT', label: 'Cash Account' },
                      { value: 'ACCOUNT_PAYABLE', label: 'Account Payable' },
                      { value: 'ACCOUNT_RECEIVABLE', label: 'Account Receivable' },
                      { value: 'EXPENSE_ACCOUNT', label: 'Expense Account' },
                      { value: 'ASSET_ACCOUNT', label: 'Asset Account' },
                      { value: 'LIABILITY_ACCOUNT', label: 'Liability Account' }
                    ]}
                    getOptionLabel={(option) => option.label}
                    value={{
                      value: typeFilter, label: typeFilter === 'all' ? 'All Types' :
                        typeFilter === 'CASH_ACCOUNT' ? 'Cash Account' :
                          typeFilter === 'ACCOUNT_PAYABLE' ? 'Account Payable' :
                            typeFilter === 'ACCOUNT_RECEIVABLE' ? 'Account Receivable' :
                              typeFilter === 'EXPENSE_ACCOUNT' ? 'Expense Account' :
                                typeFilter === 'ASSET_ACCOUNT' ? 'Asset Account' :
                                  typeFilter === 'LIABILITY_ACCOUNT' ? 'Liability Account' : 'All Types'
                    }}
                    onChange={(event, newValue) => {
                      setTypeFilter(newValue ? newValue.value : 'all');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Account Type"
                        placeholder="Select type"
                        onFocus={(e) => e.target.select()}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Fragment>
                              <InputAdornment position="start">
                                <Building size={18} color="#94a3b8" />
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
                  />
                </Box>

                {/* Category Filter */}
                <Box>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      ...customerCategories.map(category => ({
                        value: category.cus_cat_title,
                        label: category.cus_cat_title
                      }))
                    ]}
                    getOptionLabel={(option) => option.label}
                    value={{ value: categoryFilter, label: categoryFilter === 'all' ? 'All Categories' : categoryFilter }}
                    onChange={(event, newValue) => {
                      setCategoryFilter(newValue ? newValue.value : 'all');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        placeholder="Select category"
                        onFocus={(e) => e.target.select()}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Fragment>
                              <InputAdornment position="start">
                                <Filter size={18} color="#94a3b8" />
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
                  />
                </Box>

                {/* Balance Filter */}
                <Box>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
                    options={[
                      { value: 'all', label: 'All Balances' },
                      { value: 'positive', label: 'Positive Balance' },
                      { value: 'negative', label: 'Negative Balance' },
                      { value: 'zero', label: 'Zero Balance' }
                    ]}
                    getOptionLabel={(option) => option.label}
                    value={{
                      value: balanceFilter, label:
                        balanceFilter === 'all' ? 'All Balances' :
                          balanceFilter === 'positive' ? 'Positive Balance' :
                            balanceFilter === 'negative' ? 'Negative Balance' :
                              balanceFilter === 'zero' ? 'Zero Balance' : 'All Balances'
                    }}
                    onChange={(event, newValue) => {
                      setBalanceFilter(newValue ? newValue.value : 'all');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Balance Status"
                        placeholder="Select balance"
                        onFocus={(e) => e.target.select()}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Fragment>
                              <InputAdornment position="start">
                                <Wallet size={18} color="#94a3b8" />
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
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Unified Professional Stats Bar */}
        <Box sx={{ flexShrink: 0, mb: 4, width: '100%' }}>
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
                { title: 'Total Accounts', val: totalCustomers, color: '#2563eb', bg: '#eff6ff', icon: <Users size={24} />, isCurrency: false },
                { title: 'Total Receivables', val: totalReceivables, color: '#16a34a', bg: '#f0fdf4', icon: <TrendingUp size={24} />, isCurrency: true },
                { title: 'Total Payables', val: totalPayables, color: '#dc2626', bg: '#fef2f2', icon: <TrendingDown size={24} />, isCurrency: true },
                { title: 'Net Balance', val: netBalance, color: '#d97706', bg: '#fffbeb', icon: <Wallet size={24} />, isCurrency: true }
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
                        {stat.isCurrency && <span style={{ fontSize: '0.8rem', marginRight: 4, opacity: 0.6 }}>PKR</span>}
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

        {/* Customers Table */}
        <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              Accounts List
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredCustomers.length} of {customers.length}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer component={Paper} sx={{ height: '100%' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Balance</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.cus_id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{
                            bgcolor: 'primary.main',
                            mr: 2,
                            width: 40,
                            height: 40
                          }}>
                            {customer.cus_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {customer.cus_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: #{customer.sequentialId}
                            </Typography>
                            {customer.cus_reference && (
                              <Typography variant="caption" color="primary" display="block">
                                Ref: {customer.cus_reference}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">{customer.cus_phone_no}</Typography>
                          </Box>
                          {customer.cus_phone_no2 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2">{customer.cus_phone_no2}</Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {customer.cus_address}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getCustomerTypeTitle(customer.cus_type)}
                          size="small"
                          sx={{
                            backgroundColor: getTypeColor(customer.cus_type).includes('yellow') ? '#fef3c7' :
                              getTypeColor(customer.cus_type).includes('red') ? '#fee2e2' :
                                getTypeColor(customer.cus_type).includes('emerald') ? '#d1fae5' :
                                  getTypeColor(customer.cus_type).includes('orange') ? '#fed7aa' :
                                    getTypeColor(customer.cus_type).includes('indigo') ? '#e0e7ff' :
                                      getTypeColor(customer.cus_type).includes('pink') ? '#fce7f3' : '#f3f4f6',
                            color: getTypeColor(customer.cus_type).includes('yellow') ? '#92400e' :
                              getTypeColor(customer.cus_type).includes('red') ? '#dc2626' :
                                getTypeColor(customer.cus_type).includes('emerald') ? '#059669' :
                                  getTypeColor(customer.cus_type).includes('orange') ? '#ea580c' :
                                    getTypeColor(customer.cus_type).includes('indigo') ? '#4338ca' :
                                      getTypeColor(customer.cus_type).includes('pink') ? '#be185d' : '#374151'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.customer_category?.cus_cat_title || customer.cus_category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: getBalanceColor(customer.cus_balance).includes('green') ? 'success.main' :
                              getBalanceColor(customer.cus_balance).includes('red') ? 'error.main' : 'text.secondary'
                          }}
                        >
                          {parseFloat(customer.cus_balance).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCustomer(customer)}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCustomer(customer.cus_id)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Card>

        {/* Full Replica of Sales Page Customer Modal */}
        <Dialog
          open={showCustomerForm}
          onClose={() => setShowCustomerForm(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              minHeight: '80vh'
            }
          }}
        >
          <DialogTitle sx={{
            background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                mr: 2,
                width: 48,
                height: 48
              }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {editingCustomer ? 'Update customer profile' : 'Create a new customer profile'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setShowCustomerForm(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Box component="form" sx={{ mt: 2 }}>
              {/* Quick Actions */}
              <Box sx={{
                bgcolor: 'grey.50',
                borderRadius: 2,
                p: 2,
                border: 1,
                borderColor: 'grey.200',
                mb: 3
              }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<BusinessIcon />}
                    onClick={() => setShowCustomerCategoryPopup(true)}
                    sx={{
                      borderColor: 'success.main',
                      color: 'success.main',
                      '&:hover': {
                        borderColor: 'success.dark',
                        backgroundColor: 'success.light',
                        color: 'success.dark'
                      }
                    }}
                  >
                    Add Account Category
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PersonIcon />}
                    onClick={() => setShowCustomerTypePopup(true)}
                    sx={{
                      borderColor: 'secondary.main',
                      color: 'secondary.main',
                      '&:hover': {
                        borderColor: 'secondary.dark',
                        backgroundColor: 'secondary.light',
                        color: 'secondary.dark'
                      }
                    }}
                  >
                    Add Type
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LocationIcon />}
                    onClick={() => setShowCityPopup(true)}
                    sx={{
                      borderColor: 'warning.main',
                      color: 'warning.main',
                      '&:hover': {
                        borderColor: 'warning.dark',
                        backgroundColor: 'warning.light',
                        color: 'warning.dark'
                      }
                    }}
                  >
                    Add City
                  </Button>
                </Box>
              </Box>

              <Grid container spacing={3}>
                {/* First Row - Name, Primary Phone, Secondary Phone */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    required
                    label="Account Name"
                    name="cus_name"
                    value={formData.cus_name}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter account name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    required
                    label="Primary Phone"
                    name="cus_phone_no"
                    type="tel"
                    value={formData.cus_phone_no}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter primary phone number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Secondary Phone"
                    name="cus_phone_no2"
                    type="tel"
                    value={formData.cus_phone_no2}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter secondary phone number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Address"
                    name="cus_address"
                    value={formData.cus_address}
                    onChange={handleFormChange}
                    placeholder="Enter complete address"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Second Row - Customer Type, Category */}
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
                    options={customerTypes.map(type => ({
                      id: type.cus_type_id,
                      title: type.cus_type_title
                    }))}
                    getOptionLabel={(option) => option.title || ''}
                    value={(() => {
                      return customerTypes.find(option => option.cus_type_id === formData.cus_type)
                        ? { id: formData.cus_type, title: customerTypes.find(option => option.cus_type_id === formData.cus_type).cus_type_title }
                        : null;
                    })()}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        cus_type: newValue ? newValue.id : ''
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Account Type"
                        required
                        onFocus={(e) => e.target.select()}
                        sx={{ minWidth: 250 }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
                    options={customerCategories.map(category => ({
                      id: category.cus_cat_id,
                      title: category.cus_cat_title
                    }))}
                    getOptionLabel={(option) => option.title || ''}
                    value={(() => {
                      return customerCategories.find(option => option.cus_cat_id === formData.cus_category)
                        ? { id: formData.cus_category, title: customerCategories.find(option => option.cus_cat_id === formData.cus_category).cus_cat_title }
                        : null;
                    })()}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        cus_category: newValue ? newValue.id : ''
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Account Category"
                        required
                        onFocus={(e) => e.target.select()}
                        sx={{ minWidth: 250 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && params.inputProps?.ariaExpanded) {
                            const firstCat = customerCategories && customerCategories.length ? customerCategories[0].cus_cat_id : '';
                            if (!formData.cus_category && firstCat) setFormData(prev => ({ ...prev, cus_category: firstCat }));
                          }
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <BusinessIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Third Row - Reference, Account Info, City */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Reference"
                    name="cus_reference"
                    value={formData.cus_reference}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter reference number"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Account Info"
                    name="cus_account_info"
                    value={formData.cus_account_info}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter account information"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    autoSelect={true}
                    autoHighlight={true}
                    openOnFocus={true}
                    selectOnFocus={true}
                    options={cities.map(city => ({
                      id: city.city_id,
                      title: city.city_name
                    }))}
                    getOptionLabel={(option) => option.title || ''}
                    value={(() => {
                      return cities.find(option => option.city_id === formData.city_id)
                        ? { id: formData.city_id, title: cities.find(option => option.city_id === formData.city_id).city_name }
                        : null;
                    })()}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        city_id: newValue ? newValue.id : ''
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="City"
                        onFocus={(e) => e.target.select()}
                        sx={{ minWidth: 250 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && params.inputProps?.ariaExpanded) {
                            const firstCity = cities && cities.length ? cities[0].city_id : '';
                            if (!formData.city_id && firstCity) setFormData(prev => ({ ...prev, city_id: firstCity }));
                          }
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Fourth Row - CNIC, NTN, Balance */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="CNIC"
                    name="CNIC"
                    value={formData.CNIC}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter CNIC number"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="NTN Number"
                    name="NTN_NO"
                    value={formData.NTN_NO}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter NTN number"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Initial Balance"
                    name="cus_balance"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    value={formData.cus_balance}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter customer balance"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoneyIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Fifth Row - Other, Name in Urdu */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Other Information"
                    name="other"
                    value={formData.other}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter other information"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Name in Urdu"
                    name="name_urdu"
                    value={formData.name_urdu}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter name in Urdu"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setShowCustomerForm(false)} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isSubmitting}
              sx={{ bgcolor: '#6f42c1', '&:hover': { bgcolor: '#5a2d91' } }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                editingCustomer ? 'Update Customer' : 'Create Customer'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Customer Type Popup */}
        <Dialog
          open={showCustomerTypePopup}
          onClose={() => setShowCustomerTypePopup(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{
            background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                mr: 2,
                width: 40,
                height: 40
              }}>
                <BusinessIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  Add Customer Type
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Create a new Customer type
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setShowCustomerTypePopup(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleAddCustomerType} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                required
                label="Customer Type Title"
                value={customerTypeFormData.cus_type_title}
                onChange={(e) => setCustomerTypeFormData({ cus_type_title: e.target.value })}
                disabled={isAddingCustomerType}
                placeholder="Enter account type title"
                sx={{ mb: 2 }}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={() => setShowCustomerTypePopup(false)}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={isAddingCustomerType}
              onClick={handleAddCustomerType}
              sx={{
                background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976d2 30%, #7b1fa2 90%)',
                }
              }}
            >
              {isAddingCustomerType ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                  Adding...
                </Box>
              ) : (
                'Add Type'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Customer Category Popup */}
        <Dialog
          open={showCustomerCategoryPopup}
          onClose={() => setShowCustomerCategoryPopup(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{
            background: 'linear-gradient(45deg, #4caf50 30%, #2e7d32 90%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                mr: 2,
                width: 40,
                height: 40
              }}>
                <BusinessIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  Add Account Category
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Create a new Account category
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setShowCustomerCategoryPopup(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleAddCustomerCategory} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                required
                label="Account Category Title"
                value={customerCategoryFormData.cus_cat_title}
                onChange={(e) => setCustomerCategoryFormData({ cus_cat_title: e.target.value })}
                disabled={isAddingCustomerCategory}
                placeholder="Enter account category title"
                sx={{ mb: 2 }}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={() => setShowCustomerCategoryPopup(false)}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={isAddingCustomerCategory}
              onClick={handleAddCustomerCategory}
              sx={{
                background: 'linear-gradient(45deg, #4caf50 30%, #2e7d32 90%)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388e3c 30%, #1b5e20 90%)',
                }
              }}
            >
              {isAddingCustomerCategory ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                  Adding...
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckIcon sx={{ mr: 1 }} />
                  Add Category
                </Box>
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* City Popup */}
        <Dialog
          open={showCityPopup}
          onClose={() => setShowCityPopup(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{
            background: 'linear-gradient(45deg, #ff9800 30%, #f57c00 90%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                mr: 2,
                width: 40,
                height: 40
              }}>
                <LocationIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  Add City
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Create a new city
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setShowCityPopup(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleAddCity} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                required
                label="City Name"
                value={cityFormData.city_name}
                onChange={(e) => setCityFormData({ city_name: e.target.value })}
                disabled={isAddingCity}
                placeholder="Enter city name"
                sx={{ mb: 2 }}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={() => setShowCityPopup(false)}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={isAddingCity}
              onClick={handleAddCity}
              sx={{
                background: 'linear-gradient(45deg, #ff9800 30%, #f57c00 90%)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(45deg, #f57c00 30%, #ef6c00 90%)',
                }
              }}
            >
              {isAddingCity ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                  Adding...
                </Box>
              ) : (
                'Add City'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </div>

      <style jsx global>{`
        .blink-button-strong {
          animation: pulseStrong 1400ms infinite cubic-bezier(.2,.9,.2,1);
          will-change: transform, box-shadow, filter;
        }

        @keyframes pulseStrong {
          0% { transform: translateY(0) scale(1); box-shadow: 0 8px 20px rgba(139,0,0,0.18); filter: drop-shadow(0 6px 18px rgba(139,0,0,0.12)); }
          45% { transform: translateY(-4px) scale(1.03); box-shadow: 0 18px 40px rgba(139,0,0,0.28); filter: drop-shadow(0 12px 30px rgba(139,0,0,0.18)); }
          100% { transform: translateY(0) scale(1); box-shadow: 0 8px 20px rgba(139,0,0,0.18); filter: drop-shadow(0 6px 18px rgba(139,0,0,0.12)); }
        }

        /* Slight border pulse for attention */
        .blink-button-strong::after {
          content: '';
          position: absolute;
          left: 12px;
          right: 12px;
          top: 6px;
          bottom: 6px;
          border-radius: 12px;
          pointer-events: none;
          box-shadow: 0 0 0 0 rgba(139,0,0,0.12);
          animation: ring 2000ms infinite ease-out;
        }

        /* glossy shine removed — flat single red color per design */
        .shiny-button::before { display: none; }

        @keyframes ring {
          0% { box-shadow: 0 0 0 0 rgba(139,0,0,0.18); }
          70% { box-shadow: 0 10px 40px 12px rgba(139,0,0,0.06); }
          100% { box-shadow: 0 0 0 0 rgba(139,0,0,0); }
        }

        /* Respect reduced-motion preference */
        @media (prefers-reduced-motion: reduce) {
          .blink-button-strong, .blink-button-strong::after { animation: none !important; box-shadow: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
