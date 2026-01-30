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
  Check as CheckIcon
} from '@mui/icons-material';
import { Plus, Edit, Trash2, Check, X, Phone, Mail, MapPin, User, Building, CreditCard, Calendar, Search, Loader2 } from 'lucide-react';
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
        alert('Customer added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
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
        alert('Customer updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const response = await fetch(`/api/customers?id=${customerId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCustomers(prev => prev.filter(customer => customer.cus_id !== customerId));
          alert('Customer deleted successfully!');
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer');
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
        alert('Customer type added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create customer type');
      }
    } catch (error) {
      console.error('Error creating customer type:', error);
      alert('Failed to create customer type');
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
        alert('Customer category added successfully!');
      } else {
        alert('Failed to add customer category');
      }
    } catch (error) {
      console.error('Error adding customer category:', error);
      alert('Error adding customer category');
    } finally {
      setIsAddingCustomerCategory(false);
    }
  };

  // City handlers
  const handleAddCity = async (e) => {
    e.preventDefault();
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
      alert('Customer name is required');
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
      alert('Customer category is required');
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
      const matchesSearch = customer.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.cus_phone_no.includes(searchTerm) ||
        customer.cus_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.cus_reference?.toLowerCase().includes(searchTerm.toLowerCase());

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
            <p className="text-gray-600 mt-1">Manage your customers and their information</p>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCustomerForm(true)}
            sx={{
              background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
              borderRadius: '8px',
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2 30%, #7b1fa2 90%)',
                boxShadow: '0 6px 25px rgba(0,0,0,0.15)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Add New Customer
          </Button>
        </div>


        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                Filters & Search
              </Typography>
              <Button
                size="small"
                onClick={clearFilters}
                sx={{ color: 'primary.main', textTransform: 'none' }}
              >
                Clear All Filters
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* Search */}
              <Grid item xs={12} sm={6} lg={3}>
                <TextField
                  fullWidth
                  label="Search"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ minWidth: 250 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Type Filter */}
              <Grid item xs={12} sm={6} lg={3}>
                <Autocomplete
                  fullWidth
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
                      label="Customer Type"
                      placeholder="Search or select type"
                      sx={{ minWidth: 250 }}
                    />
                  )}
                  filterOptions={(options, { inputValue }) => {
                    return options.filter(option =>
                      option.label.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  ListboxProps={{
                    style: {
                      maxHeight: '200px',
                      width: '100%'
                    }
                  }}
                  slotProps={{
                    popper: {
                      style: {
                        width: '100%'
                      },
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altBoundary: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                      ],
                    },
                  }}
                />
              </Grid>

              {/* Category Filter */}
              <Grid item xs={12} sm={6} lg={3}>
                <Autocomplete
                  fullWidth
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
                      placeholder="Search or select category"
                      sx={{ minWidth: 250 }}
                    />
                  )}
                  filterOptions={(options, { inputValue }) => {
                    return options.filter(option =>
                      option.label.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  ListboxProps={{
                    style: {
                      maxHeight: '200px',
                      width: '100%'
                    }
                  }}
                  slotProps={{
                    popper: {
                      style: {
                        width: '100%'
                      },
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altBoundary: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                      ],
                    },
                  }}
                />
              </Grid>

              {/* Balance Filter */}
              <Grid item xs={12} sm={6} lg={3}>
                <Autocomplete
                  fullWidth
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
                      label="Balance"
                      placeholder="Search or select balance"
                      sx={{ minWidth: 250 }}
                    />
                  )}
                  filterOptions={(options, { inputValue }) => {
                    return options.filter(option =>
                      option.label.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  ListboxProps={{
                    style: {
                      maxHeight: '200px',
                      width: '100%'
                    }
                  }}
                  slotProps={{
                    popper: {
                      style: {
                        width: '100%'
                      },
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altBoundary: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                      ],
                    },
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{
                  bgcolor: 'primary.main',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {customers.length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{
                  bgcolor: 'success.main',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Account Types
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {customers.filter(c => ['CASH_ACCOUNT', 'ACCOUNT_PAYABLE', 'ACCOUNT_RECEIVABLE', 'EXPENSE_ACCOUNT', 'ASSET_ACCOUNT', 'LIABILITY_ACCOUNT'].includes(c.cus_type)).length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{
                  bgcolor: 'secondary.main',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <CreditCardIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Positive Balance
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {customers.filter(c => parseFloat(c.cus_balance) > 0).length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{
                  bgcolor: 'warning.main',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    New This Month
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {customers.filter(c => {
                      const createdDate = new Date(c.created_at);
                      const thisMonth = new Date();
                      thisMonth.setDate(1);
                      return createdDate >= thisMonth;
                    }).length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Customers Table */}
        <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              Customers List
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredCustomers.length} of {customers.length} customers
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer component={Paper} sx={{ height: '100%' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
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

        {/* Customer Modal */}
        <Dialog
          open={showCustomerForm}
          onClose={() => setShowCustomerForm(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
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
                  {editingCustomer ? 'Update customer information' : 'Create a new customer profile'}
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
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
                    Add Category
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
                    label="Customer Name"
                    name="cus_name"
                    value={formData.cus_name}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter customer name"
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

                {/* Second Row - Address, Customer Type, Category */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    required
                    label="Address"
                    name="cus_address"
                    value={formData.cus_address}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter customer address"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    required
                    options={[
                      { id: '', title: 'Select a type' },
                      ...customerTypes.map(type => ({
                        id: type.cus_type_id,
                        title: type.cus_type_title
                      }))
                    ]}
                    getOptionLabel={(option) => option.title || ''}
                    value={(() => {
                      const options = [
                        { id: '', title: 'Select a type' },
                        ...customerTypes.map(type => ({
                          id: type.cus_type_id,
                          title: type.cus_type_title
                        }))
                      ];
                      return options.find(option => option.id === formData.cus_type) || { id: '', title: 'Select a type' };
                    })()}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        cus_type: newValue ? newValue.id : ''
                      }));
                    }}
                    inputValue={customerTypeSearch}
                    onInputChange={(event, newInputValue) => {
                      setCustomerTypeSearch(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer Type"
                        required
                        placeholder="Search or select customer type"
                        sx={{ minWidth: 250 }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <Box component="li" key={key} {...optionProps}>
                          {option.title}
                        </Box>
                      );
                    }}
                    filterOptions={(options, { inputValue }) => {
                      return options.filter(option =>
                        option.title.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    ListboxProps={{
                      style: {
                        maxHeight: '200px'
                      }
                    }}
                    slotProps={{
                      popper: {
                        style: {
                          width: '300px'
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    required
                    options={[
                      { id: '', title: 'Select a category' },
                      ...customerCategories.map(category => ({
                        id: category.cus_cat_id,
                        title: category.cus_cat_title
                      }))
                    ]}
                    getOptionLabel={(option) => option.title || ''}
                    value={(() => {
                      const options = [
                        { id: '', title: 'Select a category' },
                        ...customerCategories.map(category => ({
                          id: category.cus_cat_id,
                          title: category.cus_cat_title
                        }))
                      ];
                      return options.find(option => option.id === formData.cus_category) || { id: '', title: 'Select a category' };
                    })()}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        cus_category: newValue ? newValue.id : ''
                      }));
                    }}
                    inputValue={categorySearch}
                    onInputChange={(event, newInputValue) => {
                      setCategorySearch(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        required
                        placeholder="Search or select category"
                        sx={{ minWidth: 250 }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <Box component="li" key={key} {...optionProps}>
                          {option.title}
                        </Box>
                      );
                    }}
                    filterOptions={(options, { inputValue }) => {
                      return options.filter(option =>
                        option.title.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    ListboxProps={{
                      style: {
                        maxHeight: '200px'
                      }
                    }}
                    slotProps={{
                      popper: {
                        style: {
                          width: '300px'
                        }
                      }
                    }}
                  />
                </Grid>

                {/* Third Row - Reference, Account Info, CNIC */}
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

                {/* Fourth Row - NTN, Urdu Name, City */}
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
                    label="Name in Urdu"
                    name="name_urdu"
                    value={formData.name_urdu}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter name in Urdu"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    options={[
                      { id: '', name: 'Select a city' },
                      ...cities.map(city => ({
                        id: city.city_id,
                        name: city.city_name
                      }))
                    ]}
                    getOptionLabel={(option) => option.name || ''}
                    value={(() => {
                      const options = [
                        { id: '', name: 'Select a city' },
                        ...cities.map(city => ({
                          id: city.city_id,
                          name: city.city_name
                        }))
                      ];
                      return options.find(option => option.id === formData.city_id) || { id: '', name: 'Select a city' };
                    })()}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        city_id: newValue ? newValue.id : ''
                      }));
                    }}
                    inputValue={citySearch}
                    onInputChange={(event, newInputValue) => {
                      setCitySearch(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="City"
                        placeholder="Search or select city"
                        sx={{ minWidth: 250 }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <Box component="li" key={key} {...optionProps}>
                          {option.name}
                        </Box>
                      );
                    }}
                    filterOptions={(options, { inputValue }) => {
                      return options.filter(option =>
                        option.name.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    ListboxProps={{
                      style: {
                        maxHeight: '200px'
                      }
                    }}
                    slotProps={{
                      popper: {
                        style: {
                          width: '100%'
                        }
                      }
                    }}
                  />
                </Grid>

                {/* Fifth Row - Balance, Other Information */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Balance"
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
                          <CreditCardIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Other Information"
                    name="other"
                    value={formData.other}
                    onChange={handleFormChange}
                    sx={{ minWidth: 250 }}
                    placeholder="Enter additional information"
                  />
                </Grid>

              </Grid>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={() => setShowCustomerForm(false)}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              onClick={handleSubmit}
              sx={{
                background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
                textTransform: 'none',
                px: 3,
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976d2 30%, #7b1fa2 90%)',
                }
              }}
            >
              {isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                  {editingCustomer ? 'Updating...' : 'Creating...'}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                  <CheckIcon sx={{ ml: 1 }} />
                </Box>
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
                  Create a new customer type
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
                placeholder="Enter customer type title"
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
                  Add Customer Category
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Create a new customer category
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
                label="Customer Category Title"
                value={customerCategoryFormData.cus_cat_title}
                onChange={(e) => setCustomerCategoryFormData({ cus_cat_title: e.target.value })}
                disabled={isAddingCustomerCategory}
                placeholder="Enter customer category title"
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
    </DashboardLayout>
  );
}
