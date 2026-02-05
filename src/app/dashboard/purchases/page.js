'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Fab,
  Checkbox
} from '@mui/material';

// Material Icons
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Error as AlertCircleIcon,
  Visibility as EyeIcon,
  BarChart as BarChartIcon,
  LocalShipping as TruckIcon,
  Inventory as PackageIcon,
  Receipt as ReceiptIcon,
  ArrowBack as ArrowLeftIcon,
  ArrowForward as ArrowRightIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CheckCircle as CheckIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  Business as BusinessIcon,
  LocationOn as MapPinIcon,
  TrendingDown as TrendingDownIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Money as MoneyIcon
} from '@mui/icons-material';

function PurchasesPageContent() {
  // State management
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtered customer lists
  const [suppliers, setSuppliers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Function to filter customers by type
  // Function to filter customers by category and type
  const filterCustomersByCategory = (customers, customerCategories, customerTypes) => {
    // Log all categories with their IDs to see what we're working with
    console.log('🔍 ALL CUSTOMER CATEGORIES:');
    customerCategories.forEach(cat => {
      console.log(`  ID: ${cat.cus_cat_id}, Title: "${cat.cus_cat_title}"`);
    });

    console.log('🔍 ALL CUSTOMER TYPES:');
    customerTypes.forEach(t => {
      console.log(`  ID: ${t.cus_type_id}, Title: "${t.cus_type_title}"`);
    });

    console.log('👥 All Customers with Category and Type:');
    customers.forEach(c => {
      const category = customerCategories.find(cat => cat.cus_cat_id === c.cus_category);
      const type = customerTypes.find(t => t.cus_type_id === c.cus_type);
      console.log(`  ID: ${c.cus_id}, Name: "${c.cus_name}", Category: "${category?.cus_cat_title || 'unknown'}", Type: "${type?.cus_type_title || 'unknown'}"`);
    });

    // Filter by category title text (case-insensitive)
    // Suppliers: category title contains "supplier"
    const filteredSuppliers = customers.filter(customer => {
      const categoryInfo = customerCategories.find(cat => cat.cus_cat_id === customer.cus_category);
      return categoryInfo && categoryInfo.cus_cat_title.toLowerCase().includes('supplier');
    });

    // Bank accounts: BOTH category AND type must contain "bank"
    const filteredBankAccounts = customers.filter(customer => {
      const categoryInfo = customerCategories.find(cat => cat.cus_cat_id === customer.cus_category);
      const typeInfo = customerTypes.find(t => t.cus_type_id === customer.cus_type);
      const hasBank = categoryInfo && categoryInfo.cus_cat_title.toLowerCase().includes('bank');
      const hasBank2 = typeInfo && typeInfo.cus_type_title.toLowerCase().includes('bank');
      return hasBank && hasBank2;
    });

    console.log(`✅ Filtered ${filteredSuppliers.length} suppliers (category contains 'supplier')`);
    console.log(`✅ Filtered ${filteredBankAccounts.length} bank accounts (BOTH category AND type contain 'bank')`);

    return { suppliers: filteredSuppliers, bankAccounts: filteredBankAccounts };
  };

  // Sample vehicle data
  const [vehicles] = useState([
    { id: 1, vehicle_no: 'ABC-123', driver_name: 'John Doe', vehicle_type: 'Truck' },
    { id: 2, vehicle_no: 'XYZ-456', driver_name: 'Jane Smith', vehicle_type: 'Van' },
    { id: 3, vehicle_no: 'DEF-789', driver_name: 'Mike Johnson', vehicle_type: 'Truck' },
    { id: 4, vehicle_no: 'GHI-012', driver_name: 'Sarah Wilson', vehicle_type: 'Van' },
    { id: 5, vehicle_no: 'JKL-345', driver_name: 'David Brown', vehicle_type: 'Truck' }
  ]);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'

  const searchParams = useSearchParams();

  // Handle URL query parameter for view
  useEffect(() => {
    const viewParam = searchParams?.get('view');
    const typeParam = searchParams?.get('type');

    if (viewParam === 'create') {
      setCurrentView('create');
    }

    if (typeParam === 'return') {
      setPurchaseType('return');
      setCurrentView('create');
    }
  }, [searchParams]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Customer form states
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
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
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Customer form dropdown data
  const [customerTypes, setCustomerTypes] = useState([]);
  const [cities, setCities] = useState([]);

  // Popup states for quick actions
  const [showCustomerCategoryPopup, setShowCustomerCategoryPopup] = useState(false);
  const [showCustomerTypePopup, setShowCustomerTypePopup] = useState(false);
  const [showCityPopup, setShowCityPopup] = useState(false);

  // Popup form data
  const [customerCategoryFormData, setCustomerCategoryFormData] = useState({ cus_cat_title: '' });
  const [customerTypeFormData, setCustomerTypeFormData] = useState({ cus_type_title: '' });
  const [cityFormData, setCityFormData] = useState({ city_name: '' });

  // Popup loading states
  const [isAddingCustomerCategory, setIsAddingCustomerCategory] = useState(false);
  const [isAddingCustomerType, setIsAddingCustomerType] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Product grid filter states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');

  // Selected product for preview
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    qnty: '',
    unit_rate: '',
    crate: ''
  });

  // Customer dropdown filter states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [bankAccountDropdownOpen, setBankAccountDropdownOpen] = useState(false);
  const [formSelectedCustomer, setFormSelectedCustomer] = useState(null);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);

  // Receipt dialog states
  const [currentBillData, setCurrentBillData] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // Purchase Type and Return states
  const [purchaseType, setPurchaseType] = useState('new'); // 'new' or 'return'
  const [selectedPurchaseForReturn, setSelectedPurchaseForReturn] = useState(null);
  const [purchaseSearchResults, setPurchaseSearchResults] = useState([]);
  const [purchaseSearchOpen, setPurchaseSearchOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    cus_id: '',
    store_id: '',
    debit_account_id: '',
    credit_account_id: '',
    total_amount: '',
    unloading_amount: '',
    fare_amount: '',
    transport_amount: '',
    labour_amount: '',
    include_labour: false,
    discount: '',
    cash_payment: '',
    bank_payment: '',
    payment_type: 'CASH',
    vehicle_no: '',
    invoice_number: '',
    purchase_details: []
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Filter customers by category when both customers and customerCategories are loaded
  useEffect(() => {
    if (customers.length > 0 && customerCategories.length > 0 && customerTypes.length > 0) {
      console.log('🔍 Filtering customers - customers:', customers.length, 'categories:', customerCategories.length, 'types:', customerTypes.length);
      const { suppliers, bankAccounts } = filterCustomersByCategory(customers, customerCategories, customerTypes);
      setSuppliers(suppliers);
      setBankAccounts(bankAccounts);
    } else {
      console.log('🔍 Not filtering yet - customers:', customers.length, 'categories:', customerCategories.length, 'types:', customerTypes.length);
    }
  }, [customers, customerCategories, customerTypes]);

  // Auto-select first store when stores are loaded
  useEffect(() => {
    if (stores.length > 0 && !formData.store_id) {
      const firstStore = stores[0];
      setFormData(prev => ({
        ...prev,
        store_id: firstStore.storeid.toString()
      }));
      console.log('🔍 Auto-selected first store:', firstStore.store_name);
    }
  }, [stores, formData.store_id]);

  // Function to handle labour charges distribution
  const handleLabourDistribution = (includeLabour, labourAmount, purchaseDetails) => {
    console.log('🔧 handleLabourDistribution called:', { includeLabour, labourAmount, purchaseDetailsLength: purchaseDetails.length });

    if (includeLabour && labourAmount && purchaseDetails.length > 0) {
      const labourAmountNum = parseFloat(labourAmount || 0);
      const totalQuantity = purchaseDetails.reduce((sum, detail) => sum + parseFloat(detail.qnty || 0), 0);

      console.log('🔧 Labour distribution:', { labourAmountNum, totalQuantity });

      if (totalQuantity > 0) {
        const labourPerUnit = labourAmountNum / totalQuantity;
        console.log('🔧 Labour per unit:', labourPerUnit);

        const updatedDetails = purchaseDetails.map(detail => {
          // Do NOT change crate. Apply labour only to price (unit_rate/rate)
          const originalRate = parseFloat(
            (detail.original_rate ?? detail.unit_rate ?? detail.rate ?? 0)
          );
          const newRate = (originalRate + labourPerUnit).toFixed(2);

          console.log('🔧 Product update (price only):', {
            product: detail.product_name,
            originalRate,
            newRate,
            quantity: detail.qnty,
            crate: detail.crate
          });

          return {
            ...detail,
            // keep crate unchanged; update price fields only
            unit_rate: newRate,
            rate: newRate,
            original_rate: detail.original_rate ?? detail.unit_rate ?? detail.rate ?? 0,
            // total should remain based on crate
            total_amount: (parseFloat(detail.crate ?? 0) * parseFloat(detail.qnty || 0)).toFixed(2)
          };
        });

        return updatedDetails;
      }
    } else if (!includeLabour && purchaseDetails.length > 0) {
      console.log('🔧 Removing labour charges - restoring original unit prices (crate unchanged)');
      // Remove labour charges - restore original unit prices; crate stays as-is
      const updatedDetails = purchaseDetails.map(detail => {
        const restoredRate = detail.original_rate ?? detail.unit_rate ?? detail.rate ?? 0;

        return {
          ...detail,
          unit_rate: restoredRate,
          rate: restoredRate,
          // total remains crate * quantity
          total_amount: (parseFloat(detail.crate ?? 0) * parseFloat(detail.qnty || 0)).toFixed(2)
        };
      });

      return updatedDetails;
    }

    return purchaseDetails;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, customersRes, productsRes, categoriesRes, subcategoriesRes, storesRes, customerCategoriesRes, customerTypesRes, citiesRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/subcategories'),
        fetch('/api/stores'),
        fetch('/api/customer-category'),
        fetch('/api/customer-types'),
        fetch('/api/cities')
      ]);

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
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
      if (subcategoriesRes.ok) {
        const subcategoriesData = await subcategoriesRes.json();
        setSubcategories(subcategoriesData);
      }
      if (storesRes.ok) {
        const storesResponse = await storesRes.json();
        const storesData = storesResponse.success ? storesResponse.data : [];
        setStores(Array.isArray(storesData) ? storesData : []);
      } else {
        console.error('Stores API error:', storesRes.status, storesRes.statusText);
        setStores([]);
      }

      if (customerCategoriesRes.ok) {
        const customerCategoriesData = await customerCategoriesRes.json();
        setCustomerCategories(Array.isArray(customerCategoriesData) ? customerCategoriesData : []);
      } else {
        console.error('Customer Categories API error:', customerCategoriesRes.status, customerCategoriesRes.statusText);
        setCustomerCategories([]);
      }

      if (customerTypesRes.ok) {
        const customerTypesData = await customerTypesRes.json();
        setCustomerTypes(Array.isArray(customerTypesData) ? customerTypesData : []);
      } else {
        console.error('Customer Types API error:', customerTypesRes.status, customerTypesRes.statusText);
        setCustomerTypes([]);
      }

      if (citiesRes.ok) {
        const citiesData = await citiesRes.json();
        setCities(Array.isArray(citiesData) ? citiesData : []);
      } else {
        console.error('Cities API error:', citiesRes.status, citiesRes.statusText);
        setCities([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching data',
        severity: 'error'
      });
      // Ensure all dropdown data are always arrays even on error
      setStores([]);
      setCustomerCategories([]);
      setCustomerTypes([]);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get sort label
  const getSortLabel = (value) => {
    const labels = {
      'created_at-desc': 'Newest First',
      'created_at-asc': 'Oldest First',
      'customer-asc': 'Customer A-Z',
      'customer-desc': 'Customer Z-A',
      'net_total-desc': 'Amount High-Low',
      'net_total-asc': 'Amount Low-High'
    };
    return labels[value] || 'Newest First';
  };

  // Filter and sort logic
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || purchase.cus_id === selectedCustomer;

    const matchesStore = filterStore === '' ||
      (purchase.store_id?.toString() === filterStore) ||
      (purchase.purchase_details && purchase.purchase_details.some(detail =>
        detail.store_id?.toString() === filterStore
      ));

    const totalAmount = parseFloat(purchase.net_total || 0);
    const matchesMinAmount = filterMinAmount === '' ||
      totalAmount >= parseFloat(filterMinAmount);
    const matchesMaxAmount = filterMaxAmount === '' ||
      totalAmount <= parseFloat(filterMaxAmount);

    const matchesDateFrom = dateFrom === '' ||
      (dateFrom && purchase.created_at && new Date(purchase.created_at) >= new Date(dateFrom));

    const matchesDateTo = dateTo === '' ||
      (dateTo && purchase.created_at && new Date(purchase.created_at) <= new Date(dateTo));

    return matchesSearch && matchesCustomer && matchesStore && matchesMinAmount && matchesMaxAmount && matchesDateFrom && matchesDateTo;
  });

  // Product filtering logic
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(sub => sub.cat_id === selectedCategory);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.pro_title.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.pro_description?.toLowerCase().includes(productSearchTerm.toLowerCase());

    return matchesSearch;
  });

  // Customer filtering logic
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.cus_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.cus_phone_no?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.cus_email?.toLowerCase().includes(customerSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedPurchases = filteredPurchases.sort((a, b) => {
    let aValue, bValue;

    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'net_total') {
      aValue = parseFloat(a.net_total);
      bValue = parseFloat(b.net_total);
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

  const finalPurchases = sortedPurchases.map((purchase, index) => ({
    ...purchase,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalPurchases = purchases.length;
  const totalPurchaseValue = purchases.reduce((sum, p) => sum + parseFloat(p.net_total), 0);
  const totalUnloadingAmount = purchases.reduce((sum, p) => sum + parseFloat(p.unloading_amount), 0);
  const totalFareAmount = purchases.reduce((sum, p) => sum + parseFloat(p.fare_amount), 0);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle product selection (show in preview section)
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProductFormData({
      qnty: '1',
      unit_rate: product.pro_cost_price.toString(),
      crate: product.pro_cost_price.toString()
    });
  };

  // Add product to purchase list
  const addProductToPurchase = () => {
    if (!selectedProduct) return;

    // Check if store is selected
    if (!formData.store_id) {
      alert('Please select a store before adding products');
      return;
    }

    const existingDetail = formData.purchase_details.find(detail => detail.pro_id === selectedProduct.pro_id);

    if (existingDetail) {
      alert('Product already exists in the purchase list');
      return;
    }

    const totalAmount = parseFloat(productFormData.qnty) * parseFloat(productFormData.crate || productFormData.unit_rate);

    const newDetail = {
      pro_id: selectedProduct.pro_id,
      product_id: selectedProduct.pro_id, // Add product_id for console logging
      store_id: formData.store_id, // Add store_id to each product detail
      qnty: productFormData.qnty, // Changed from 'quantity' to 'qnty' to match table
      unit: selectedProduct.pro_unit,
      rate: productFormData.unit_rate,
      unit_rate: productFormData.unit_rate, // Keep for backward compatibility
      crate: productFormData.crate || productFormData.unit_rate, // Use crate value or fallback to unit_rate
      total_amount: totalAmount.toString(),
      discount: '0'
    };

    setFormData(prev => {
      const updatedPurchaseDetails = [...prev.purchase_details, newDetail];

      // Apply labour distribution if checkbox is checked
      const finalPurchaseDetails = handleLabourDistribution(
        prev.include_labour,
        prev.labour_amount,
        updatedPurchaseDetails
      );

      return {
        ...prev,
        purchase_details: finalPurchaseDetails
      };
    });

    // Reset selection
    setSelectedProduct(null);
    setProductFormData({
      qnty: '1',
      unit_rate: '',
      crate: ''
    });
  };

  // Keyboard shortcut 'a' to add product
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Trigger if 'a' is pressed (case-insensitive) and not in an input/textarea
      if (e.key.toLowerCase() === 'a' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable) {
        const addBtn = document.getElementById('add-product-btn');
        if (addBtn && !addBtn.disabled) {
          e.preventDefault();
          addBtn.click();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, cus_id: customer.cus_id }));
    setCustomerSearchTerm(customer.cus_name);
    setFormSelectedCustomer(customer);
    setShowCustomerDropdown(false);
  };

  const getSelectedCustomer = () => {
    return customers.find(customer => customer.cus_id === formData.cus_id);
  };

  const removePurchaseDetail = (index) => {
    setFormData(prev => ({
      ...prev,
      purchase_details: prev.purchase_details.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalAmount = () => {
    return formData.purchase_details.reduce((sum, detail) => sum + parseFloat(detail.total_amount || 0), 0);
  };

  const calculateNetTotal = () => {
    const totalAmount = calculateTotalAmount();
    const unloadingAmount = parseFloat(formData.unloading_amount || 0);
    const transportAmount = parseFloat(formData.transport_amount || 0);
    const labourAmount = parseFloat(formData.labour_amount || 0);
    const discount = parseFloat(formData.discount || 0);

    return totalAmount + unloadingAmount + transportAmount + labourAmount - discount;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validation
      if (!formData.cus_id) {
        alert('Please select a customer');
        return;
      }

      // Validate vehicle only for new purchases
      if (purchaseType === 'new' && !formData.vehicle_no) {
        alert('Please select a vehicle');
        return;
      }

      // Validate that purchase is selected for returns
      if (purchaseType === 'return' && !selectedPurchaseForReturn) {
        alert('Please select a purchase to return');
        return;
      }

      if (formData.purchase_details.length === 0) {
        alert('Please add at least one product to the purchase');
        return;
      }

      const url = editingPurchase ? '/api/purchases' : '/api/purchases';
      const method = editingPurchase ? 'PUT' : 'POST';

      // Calculate total amount from purchase details (Subtotal only)
      // NOTE: Backend calculates Net Total by adding charges to this amount.
      // So we must send the Subtotal here, NOT the Net Total.
      const calculatedTotalAmount = calculateTotalAmount();

      // Set proper debit and credit accounts for purchase transaction
      // For purchases: Debit = Inventory/Stock Account, Credit = Supplier Account or Cash Account
      let debitAccountId = '';
      let creditAccountId = '';

      // Find inventory/stock account (assuming it's an ASSET_ACCOUNT type)
      const inventoryAccount = customers.find(customer =>
        customer.cus_type === 'ASSET_ACCOUNT' &&
        customer.cus_name.toLowerCase().includes('inventory')
      );

      if (inventoryAccount) {
        debitAccountId = inventoryAccount.cus_id;
      }

      // Calculate total payment amount
      const cashPayment = parseFloat(formData.cash_payment || 0);
      const bankPayment = parseFloat(formData.bank_payment || 0);
      const totalPayment = cashPayment + bankPayment;

      // Set payment type based on which payments are made
      let paymentType = 'CASH';
      if (cashPayment > 0 && bankPayment > 0) {
        paymentType = 'SPLIT';
      } else if (bankPayment > 0) {
        paymentType = 'BANK_TRANSFER';
      }

      // Set credit account based on payment type
      if (cashPayment > 0) {
        // If cash payment, credit cash account
        const cashAccount = customers.find(customer =>
          customer.cus_name === 'Cash Account'
        );
        console.log('🔍 Looking for cash account:', {
          allCustomers: customers.map(c => ({ id: c.cus_id, name: c.cus_name, type: c.cus_type })),
          cashCustomers: customers.filter(c => c.cus_name.toLowerCase().includes('cash')),
          foundCashAccount: cashAccount
        });
        creditAccountId = cashAccount ? cashAccount.cus_id : formData.cus_id;
      } else if (bankPayment > 0) {
        // If bank payment, use selected bank account
        creditAccountId = selectedBankAccount ? selectedBankAccount.cus_id : formData.cus_id;
      } else {
        // If no payment, credit supplier account (accounts payable)
        creditAccountId = formData.cus_id;
      }

      const body = editingPurchase
        ? {
          id: editingPurchase.pur_id,
          ...formData,
          total_amount: calculatedTotalAmount.toString(),
          debit_account_id: debitAccountId,
          credit_account_id: creditAccountId,
          bank_account_id: selectedBankAccount ? selectedBankAccount.cus_id : null,
          payment: totalPayment,
          payment_type: paymentType,
          cash_payment: cashPayment,
          bank_payment: bankPayment,
          purchase_type: purchaseType,
          return_for_purchase_id: purchaseType === 'return' ? selectedPurchaseForReturn?.pur_id : null
        }
        : {
          ...formData,
          total_amount: calculatedTotalAmount.toString(),
          debit_account_id: debitAccountId,
          credit_account_id: creditAccountId,
          bank_account_id: selectedBankAccount ? selectedBankAccount.cus_id : null,
          payment: totalPayment,
          payment_type: paymentType,
          cash_payment: cashPayment,
          bank_payment: bankPayment,
          purchase_type: purchaseType,
          return_for_purchase_id: purchaseType === 'return' ? selectedPurchaseForReturn?.pur_id : null
        };

      console.log('🔍 Purchase API Request Body:', {
        payment_type: paymentType,
        credit_account_id: creditAccountId,
        bank_account_id: selectedBankAccount ? selectedBankAccount.cus_id : null,
        selectedBankAccount: selectedBankAccount,
        total_payment: totalPayment,
        cash_payment: cashPayment,
        bank_payment: bankPayment,
        cashAccountFound: customers.find(c => c.cus_name === 'Cash Account'),
        allCashAccounts: customers.filter(c => c.cus_name.toLowerCase().includes('cash'))
      });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();

        // Store bill data for printing receipt
        const billDataForPrint = {
          pur_id: result.pur_id,
          cus_id: result.cus_id,
          total_amount: result.total_amount,
          discount: parseFloat(result.discount) || 0,
          payment: result.payment,
          payment_type: result.payment_type || 'CASH',
          cash_payment: parseFloat(result.cash_payment) || 0,
          bank_payment: parseFloat(result.bank_payment) || 0,
          bank_title: selectedBankAccount?.cus_name || null,
          invoice_number: result.invoice_number || '',
          created_at: result.created_at || new Date().toISOString(),
          customer: customers.find(c => c.cus_id === result.cus_id),
          purchase_details: result.purchase_details || formData.purchase_details,
          // Add missing amount fields from formData
          labour_amount: parseFloat(result.labour_amount || formData.labour_amount || 0),
          fare_amount: parseFloat(result.fare_amount || formData.fare_amount || 0),
          transport_amount: parseFloat(result.transport_amount || formData.transport_amount || 0),
          unloading_amount: parseFloat(result.unloading_amount || formData.unloading_amount || 0),
          vehicle_no: result.vehicle_no || formData.vehicle_no,
          bill_type: purchaseType === 'return' ? 'PURCHASE_RETURN' : 'PURCHASE'
        };
        setCurrentBillData(billDataForPrint);

        // Open receipt dialog
        setReceiptDialogOpen(true);

        await fetchData();
        setCurrentView('list');
        setEditingPurchase(null);
        setPurchaseType('new');
        setSelectedPurchaseForReturn(null);
        setFormData({
          cus_id: '',
          store_id: '',
          debit_account_id: '',
          credit_account_id: '',
          total_amount: '',
          unloading_amount: '',
          fare_amount: '',
          transport_amount: '',
          labour_amount: '',
          include_labour: false,
          discount: '',
          cash_payment: '',
          bank_payment: '',
          payment_type: 'CASH',
          vehicle_no: '',
          invoice_number: '',
          purchase_details: []
        });
        setSelectedBankAccount(null);
        setFormSelectedCustomer(null);
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      cus_id: purchase.cus_id,
      store_id: purchase.store_id?.toString() || '',
      debit_account_id: purchase.debit_account_id || '',
      credit_account_id: purchase.credit_account_id || '',
      total_amount: purchase.total_amount.toString(),
      unloading_amount: purchase.unloading_amount.toString(),
      fare_amount: purchase.fare_amount.toString(),
      transport_amount: purchase.transport_amount?.toString() || '',
      labour_amount: purchase.labour_amount?.toString() || '',
      include_labour: purchase.include_labour || false,
      discount: purchase.discount.toString(),
      cash_payment: purchase.payment_type === 'CASH' ? purchase.payment.toString() : '',
      bank_payment: purchase.payment_type === 'BANK_TRANSFER' ? purchase.payment.toString() : '',
      payment_type: purchase.payment_type,
      vehicle_no: purchase.vehicle_no || '',
      invoice_number: purchase.invoice_number || '',
      purchase_details: purchase.purchase_details || []
    });

    // Set selected bank account if credit_account_id exists
    if (purchase.credit_account_id) {
      const bankAccount = customers.find(customer => customer.cus_id === purchase.credit_account_id);
      setSelectedBankAccount(bankAccount || null);
    } else {
      setSelectedBankAccount(null);
    }

    // Set selected customer for the form
    const customer = customers.find(customer => customer.cus_id === purchase.cus_id);
    setFormSelectedCustomer(customer || null);

    setCurrentView('create');
  };

  const handleViewPurchase = (purchase) => {
    console.log('📊 Viewing Purchase Data:', {
      pur_id: purchase.pur_id,
      payment_type: purchase.payment_type,
      payment: purchase.payment,
      cash_payment: purchase.cash_payment,
      bank_payment: purchase.bank_payment,
      total_amount: purchase.total_amount,
      net_total: purchase.net_total,
      fullPurchaseData: purchase
    });

    // Calculate actual net total including all charges for display
    const productTotal = purchase.purchase_details?.reduce((sum, detail) =>
      sum + parseFloat(detail.total_amount || 0), 0) || parseFloat(purchase.total_amount || 0);
    const calculatedNetTotal = productTotal +
      parseFloat(purchase.unloading_amount || 0) +
      parseFloat(purchase.transport_amount || 0) +
      parseFloat(purchase.labour_amount || 0) +
      parseFloat(purchase.fare_amount || 0) -
      parseFloat(purchase.discount || 0);

    // Use database values if available, otherwise calculate based on payment_type
    let cashPayment = parseFloat(purchase.cash_payment || 0);
    let bankPayment = parseFloat(purchase.bank_payment || 0);

    // Fallback logic for older records without cash_payment/bank_payment fields
    if (cashPayment === 0 && bankPayment === 0 && parseFloat(purchase.payment || 0) > 0) {
      const totalPayment = parseFloat(purchase.payment || 0);
      if (purchase.payment_type === 'CASH') {
        cashPayment = totalPayment;
        bankPayment = 0;
      } else if (purchase.payment_type === 'BANK_TRANSFER') {
        cashPayment = 0;
        bankPayment = totalPayment;
      } else {
        // For other payment types, show as cash by default
        cashPayment = totalPayment;
        bankPayment = 0;
      }
    }

    const enhancedPurchase = {
      ...purchase,
      // Use calculated net total for accurate display
      display_net_total: calculatedNetTotal,
      // Use calculated or database payment values
      cash_payment: cashPayment,
      bank_payment: bankPayment
    };

    console.log('📊 Enhanced Purchase Data:', {
      cash_payment: enhancedPurchase.cash_payment,
      bank_payment: enhancedPurchase.bank_payment,
      payment_type: enhancedPurchase.payment_type,
      total_payment: enhancedPurchase.payment,
      net_total: calculatedNetTotal,
      display_net_total: enhancedPurchase.display_net_total
    });

    setViewingPurchase(enhancedPurchase);
    setViewDialogOpen(true);
  };

  // Handle purchase search for returns - filter by selected supplier
  const handlePurchaseSearch = (searchValue) => {
    // If no supplier selected, don't search
    if (!formSelectedCustomer) {
      setPurchaseSearchResults([]);
      return;
    }

    if (!searchValue || searchValue.trim() === '') {
      // Show all purchases from the selected supplier if search is empty
      const supplierPurchases = purchases.filter(purchase => purchase.cus_id === formSelectedCustomer.cus_id);
      setPurchaseSearchResults(supplierPurchases);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    // Filter purchases by selected supplier AND search term
    const results = purchases.filter(purchase => {
      // Only show purchases from selected supplier
      if (purchase.cus_id !== formSelectedCustomer.cus_id) {
        return false;
      }
      // Then filter by search term
      return (
        purchase.invoice_number?.toLowerCase().includes(searchLower) ||
        purchase.pur_id?.toString().includes(searchLower)
      );
    });

    setPurchaseSearchResults(results);
  };

  // Handle loading purchase data for return
  const handleLoadPurchaseForReturn = (purchase) => {
    console.log('📦 Loading purchase for return:', purchase);

    // Set the selected purchase
    setSelectedPurchaseForReturn(purchase);

    // Load purchase data into form
    const customer = customers.find(c => c.cus_id === purchase.cus_id);
    setFormSelectedCustomer(customer || null);

    // Load all purchase details
    setFormData(prev => ({
      ...prev,
      cus_id: purchase.cus_id,
      store_id: purchase.store_id?.toString() || '',
      total_amount: purchase.total_amount.toString(),
      unloading_amount: purchase.unloading_amount.toString(),
      fare_amount: purchase.fare_amount.toString(),
      transport_amount: purchase.transport_amount?.toString() || '',
      labour_amount: purchase.labour_amount?.toString() || '',
      include_labour: purchase.include_labour || false,
      discount: purchase.discount.toString(),
      vehicle_no: purchase.vehicle_no || '',
      purchase_details: purchase.purchase_details?.map(detail => ({
        ...detail,
        // For return, negate the quantity
        qnty: detail.qnty
      })) || []
    }));

    // Close search
    setPurchaseSearchOpen(false);
    setPurchaseSearchResults([]);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewingPurchase(null);
  };

  // Handle adding customer category
  const handleAddCustomerCategory = async (e) => {
    e?.preventDefault();
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
        showSnackbar('Account category added successfully!', 'success');
      } else {
        showSnackbar('Failed to add account category', 'error');
      }
    } catch (error) {
      console.error('Error adding account category:', error);
      showSnackbar('Error adding account category', 'error');
    } finally {
      setIsAddingCustomerCategory(false);
    }
  };

  // Handle adding customer type
  const handleAddCustomerType = async (e) => {
    e?.preventDefault();
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
        showSnackbar('Account type added successfully!', 'success');
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to create account type', 'error');
      }
    } catch (error) {
      console.error('Error creating account type:', error);
      showSnackbar('Error creating account type', 'error');
    } finally {
      setIsAddingCustomerType(false);
    }
  };

  // Handle adding city
  const handleAddCity = async (e) => {
    e?.preventDefault();
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
        showSnackbar('City added successfully!', 'success');
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to create city', 'error');
      }
    } catch (error) {
      console.error('Error creating city:', error);
      showSnackbar('Error creating city', 'error');
    } finally {
      setIsAddingCity(false);
    }
  };

  const handleDelete = async (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        const response = await fetch(`/api/purchases?id=${purchaseId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting purchase:', error);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('');
    setSortBy('created_at');
    setSortOrder('desc');
    setDateFrom('');
    setDateTo('');
    setFilterStore('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
  };

  // Customer form handlers
  const handleCustomerFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCustomer = async () => {
    // Validation
    if (!customerFormData.cus_name.trim()) {
      setSnackbar({
        open: true,
        message: 'Supplier name is required',
        severity: 'error'
      });
      return;
    }
    if (!customerFormData.cus_phone_no.trim()) {
      setSnackbar({
        open: true,
        message: 'Phone number is required',
        severity: 'error'
      });
      return;
    }
    if (!customerFormData.cus_address.trim()) {
      setSnackbar({
        open: true,
        message: 'Address is required',
        severity: 'error'
      });
      return;
    }
    if (!customerFormData.cus_category) {
      setSnackbar({
        open: true,
        message: 'Supplier category is required',
        severity: 'error'
      });
      return;
    }
    if (!customerFormData.cus_type) {
      setSnackbar({
        open: true,
        message: 'Supplier type is required',
        severity: 'error'
      });
      return;
    }
    if (!customerFormData.city_id) {
      setSnackbar({
        open: true,
        message: 'City is required',
        severity: 'error'
      });
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cus_name: customerFormData.cus_name,
          cus_phone_no: customerFormData.cus_phone_no,
          cus_phone_no2: customerFormData.cus_phone_no2 || '',
          cus_address: customerFormData.cus_address,
          cus_reference: customerFormData.cus_reference || '',
          cus_account_info: customerFormData.cus_account_info || '',
          other: customerFormData.other || '',
          cus_type: customerFormData.cus_type,
          cus_category: customerFormData.cus_category,
          cus_balance: parseFloat(customerFormData.cus_balance || 0),
          CNIC: customerFormData.CNIC || '',
          NTN_NO: customerFormData.NTN_NO || '',
          name_urdu: customerFormData.name_urdu || '',
          city_id: customerFormData.city_id
        })
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setSnackbar({
          open: true,
          message: 'Supplier added successfully',
          severity: 'success'
        });
        setCustomerFormData({
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
        setShowCustomerForm(false);
        // Refresh customers list
        await fetchData();
      } else {
        setSnackbar({
          open: true,
          message: 'Error adding supplier',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      setSnackbar({
        open: true,
        message: 'Error adding supplier',
        severity: 'error'
      });
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleCloseCustomerForm = () => {
    setShowCustomerForm(false);
    setCustomerFormData({
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
  };


  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
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

  // Render Purchase List View
  const renderPurchaseListView = () => (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Purchase Management
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage your purchase orders, suppliers, and inventory
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
              Add New Purchase
            </Button>
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
                  { title: 'Total Purchases', val: totalPurchases, color: '#2563eb', bg: '#eff6ff', icon: <ShoppingCartIcon /> },
                  { title: 'Total Value', val: totalPurchaseValue, color: '#16a34a', bg: '#f0fdf4', icon: <TrendingUpIcon /> },
                  { title: 'Unloading Amount', val: totalUnloadingAmount, color: '#dc2626', bg: '#fef2f2', icon: <TruckIcon /> },
                  { title: 'Fare Amount', val: totalFareAmount, color: '#d97706', bg: '#fffbeb', icon: <MoneyIcon /> }
                ].map((stat, i) => (
                  <Box key={i} sx={{
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
                        {i > 0 && <span style={{ fontSize: '0.8rem', marginRight: 4, opacity: 0.6 }}>PKR</span>}
                        {stat.val.toLocaleString()}
                      </Typography>
                    </Box>
                    {i < 3 && (
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                          display: { xs: 'none', md: 'block' },
                          bgcolor: '#e5e7eb',
                          height: 60,
                          position: 'absolute',
                          right: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Card>
          </Box>

          {/* Filters & Sorting Section */}
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
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon sx={{ color: '#64748b' }} />
                    Filters & Sorting
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Showing <strong>{filteredPurchases.length}</strong> of <strong>{purchases.length}</strong> purchases
                    </Typography>
                    <Button
                      onClick={clearFilters}
                      size="small"
                      startIcon={<ClearIcon />}
                      sx={{
                        color: '#64748b',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' }
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </Box>
                </Box>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(4, 1fr)'
                  },
                  gap: 3,
                  width: '100%'
                }}>
                  {/* Search */}
                  <Box>
                    <TextField
                      fullWidth
                      label="Search Purchases"
                      placeholder="ID, Supplier, or Reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon size={18} sx={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>

                  {/* Customer (Supplier) Filter */}
                  <Box>
                    <Autocomplete
                      fullWidth
                      options={customers.filter(customer =>
                        customer.customer_category?.cus_cat_title?.toLowerCase().includes('supplier')
                      )}
                      getOptionLabel={(option) => option.cus_name || ''}
                      value={customers.find(c => c.cus_id === selectedCustomer) || null}
                      onChange={(event, newValue) => setSelectedCustomer(newValue ? newValue.cus_id : '')}
                      autoSelect={true}
                      openOnFocus={true}
                      selectOnFocus={true}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Supplier"
                          placeholder="All Suppliers"
                          onFocus={(e) => e.target.select()}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                        />
                      )}
                    />
                  </Box>

                  {/* Date From */}
                  <Box>
                    <TextField
                      fullWidth
                      label="From Date"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>

                  {/* Date To */}
                  <Box>
                    <TextField
                      fullWidth
                      label="To Date"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>

                  {/* Store Filter */}
                  <Box>
                    <Autocomplete
                      fullWidth
                      options={stores}
                      getOptionLabel={(option) => option.store_name || ''}
                      value={stores.find(s => s.storeid.toString() === filterStore) || null}
                      onChange={(event, newValue) => setFilterStore(newValue ? newValue.storeid.toString() : '')}
                      autoSelect={true}
                      openOnFocus={true}
                      selectOnFocus={true}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Store"
                          placeholder="All Stores"
                          onFocus={(e) => e.target.select()}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                        />
                      )}
                    />
                  </Box>

                  {/* Min Amount */}
                  <Box>
                    <TextField
                      fullWidth
                      label="Min Amount"
                      type="number"
                      placeholder="e.g. 1000"
                      value={filterMinAmount}
                      onChange={(e) => setFilterMinAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>

                  {/* Max Amount */}
                  <Box>
                    <TextField
                      fullWidth
                      label="Max Amount"
                      type="number"
                      placeholder="e.g. 50000"
                      value={filterMaxAmount}
                      onChange={(e) => setFilterMaxAmount(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>

                  {/* Sort */}
                  <Autocomplete
                    fullWidth
                    options={[
                      { value: 'created_at-desc', label: 'Newest First' },
                      { value: 'created_at-asc', label: 'Oldest First' },
                      { value: 'customer-asc', label: 'Supplier A-Z' },
                      { value: 'customer-desc', label: 'Supplier Z-A' },
                      { value: 'net_total-desc', label: 'Amount High-Low' },
                      { value: 'net_total-asc', label: 'Amount Low-High' }
                    ]}
                    getOptionLabel={(option) => option.label}
                    value={{ value: `${sortBy}-${sortOrder}`, label: getSortLabel(`${sortBy}-${sortOrder}`) }}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        const [field, order] = newValue.value.split('-');
                        setSortBy(field);
                        setSortOrder(order);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Sort By"
                        placeholder="Select..."
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                      />
                    )}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Purchases Table */}
          <Card>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'semibold' }}>
                Purchases List
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {finalPurchases.length} of {purchases.length} purchases
              </Typography>
            </Box>

            {finalPurchases.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No purchases found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm || selectedCustomer
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by adding your first purchase.'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Purchase</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-2">Amounts</div>
                    <div className="col-span-1">Payment</div>
                    <div className="col-span-1">Vehicle</div>
                    <div className="col-span-1">Created</div>
                    <div className="col-span-2">Updated By</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>

                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalPurchases.map((purchase) => {
                      return (
                        <div key={purchase.pur_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                          {/* Purchase */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Purchase #{purchase.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {purchase.pur_id.toString().slice(-8)}</div>
                            </div>
                          </div>

                          {/* Customer */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{purchase.customer?.cus_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{purchase.customer?.cus_phone_no || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Amounts */}
                          <div className="col-span-2">
                            <div className="text-sm font-semibold text-green-600">{parseFloat(purchase.net_total).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              Total: {parseFloat(purchase.total_amount).toFixed(2)} |
                              Unload: {parseFloat(purchase.unloading_amount).toFixed(2)} |
                              Fare: {parseFloat(purchase.fare_amount).toFixed(2)}
                            </div>
                            {purchase.discount > 0 && (
                              <div className="text-xs text-red-500">Discount: -{parseFloat(purchase.discount).toFixed(2)}</div>
                            )}
                          </div>

                          {/* Payment */}
                          <div className="col-span-1 flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{purchase.payment_type}</div>
                              <div className="text-xs text-gray-500">{parseFloat(purchase.payment).toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Vehicle */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">{purchase.vehicle_no || 'N/A'}</div>
                          </div>

                          {/* Created */}
                          <div className="col-span-1 flex items-center">
                            <div className="text-sm text-gray-900">
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Updated By */}
                          <div className="col-span-2 flex items-center">
                            {purchase.updated_by_user?.full_name ? (
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-white text-xs font-bold">
                                    {purchase.updated_by_user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {purchase.updated_by_user.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {purchase.updated_by_user.role || 'User'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">N/A</div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex items-center">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewPurchase(purchase)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                title="View Purchase Details"
                              >
                                <EyeIcon />
                              </button>
                              <button
                                onClick={() => handleEdit(purchase)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Purchase"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => handleDelete(purchase.pur_id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Purchase"
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Stack>
      </Container>
    </DashboardLayout>
  );

  // Render Purchase Create View
  const renderPurchaseCreateView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => {
                  setCurrentView('list');
                  setPurchaseType('new');
                  setSelectedPurchaseForReturn(null);
                }}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeftIcon />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingPurchase
                    ? 'Edit Purchase'
                    : purchaseType === 'return'
                      ? 'Create Purchase Return'
                      : 'Create New Purchase'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingPurchase
                    ? 'Update purchase information'
                    : purchaseType === 'return'
                      ? 'Return items from an existing purchase'
                      : 'Select products and create purchase order'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header Section */}
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {purchaseType === 'return' && selectedPurchaseForReturn ? `Return for Purchase #${selectedPurchaseForReturn.pur_id}` : 'Purchase #'}
              </Typography>
              {purchaseType === 'new' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCustomerForm(true)}
                    sx={{
                      bgcolor: 'primary.main',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    + New Supplier
                  </Button>
                </Box>
              )}
              {purchaseType === 'new' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Invoice No"
                    sx={{ width: 200 }}
                  />
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: 'secondary.main',
                      '&:hover': { bgcolor: 'secondary.dark' },
                      minWidth: 80
                    }}
                  >
                    Q Find
                  </Button>
                </Box>
              )}
            </Box>
          </Card>

          {/* Main Form */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Purchase Type Selection Section */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
                <Grid container spacing={3} alignItems="flex-start">
                  {/* Purchase Type Dropdown */}
                  {/* Purchase Type Dropdown */}
                  <Grid size={{ xs: 12, md: 12 }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 2,
                      background: purchaseType === 'new'
                        ? 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)'
                        : 'linear-gradient(45deg, #c62828 30%, #ef5350 90%)',
                      boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                      color: 'white',
                      transition: 'all 0.3s ease',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                          {purchaseType === 'new' ? 'New Purchase Entry' : 'Purchase Return Entry'}
                        </Typography>
                        <Box sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          {purchaseType === 'new' ? <ShoppingCartIcon sx={{ color: 'white' }} /> : <TrendingDownIcon sx={{ color: 'white' }} />}
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {purchaseType === 'new' ? 'Stock In' : 'Stock Out'}
                          </Typography>
                        </Box>
                      </Box>

                      <FormControl size="small" variant="standard" sx={{ minWidth: 200 }}>
                        <Autocomplete
                          size="small"
                          options={['new', 'return']}
                          getOptionLabel={(option) => option === 'new' ? 'New Purchase' : 'Return Purchase'}
                          value={purchaseType}
                          onChange={(e, newValue) => {
                            setPurchaseType(newValue || 'new');
                            if (newValue === 'new') {
                              setPurchaseSearchOpen(false);
                              setPurchaseSearchResults([]);
                              setSelectedPurchaseForReturn(null);
                            }
                          }}
                          autoSelect={true}
                          openOnFocus={true}
                          selectOnFocus={true}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select Transaction"
                              variant="standard"
                              sx={{
                                minWidth: 200,
                                '& .MuiInputBase-input': {
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '1.1rem',
                                  paddingRight: 2
                                },
                                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.7)' },
                                '& .MuiInput-underline:after': { borderBottomColor: 'white' },
                                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'white' }
                              }}
                            />
                          )}
                        />
                      </FormControl>
                    </Box>
                  </Grid>


                </Grid>
              </Box>

              {/* Customer and Order Details Section */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Grid container spacing={3}>
                  {/* Supplier Selection - Now visible for both New and Return */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          SUPPLIER
                        </Typography>
                        {formSelectedCustomer && (
                          <Box sx={{
                            bgcolor: 'success.light',
                            color: 'success.contrastText',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            Balance: {parseFloat(formSelectedCustomer.cus_balance || 0).toFixed(2)}
                          </Box>
                        )}
                      </Box>
                      <Autocomplete
                        size="medium"
                        open={customerDropdownOpen}
                        onOpen={() => {
                          setCustomerDropdownOpen(true);
                        }}
                        onClose={() => setCustomerDropdownOpen(false)}
                        options={suppliers.length > 0 ? suppliers : customers}
                        getOptionLabel={(option) => option.cus_name}
                        value={formSelectedCustomer}
                        onChange={(event, newValue) => {
                          if (newValue) {
                            // Call the existing selection handler if exists, or do manual sets
                            if (typeof selectCustomer === 'function') {
                              selectCustomer(newValue);
                            } else {
                              setFormSelectedCustomer(newValue);
                              setFormData(prev => ({ ...prev, cus_id: newValue.cus_id }));
                            }

                            // Additional cleanup for returns
                            if (purchaseType === 'return') {
                              setPurchaseSearchResults([]);
                              setSelectedPurchaseForReturn(null);
                              setPurchaseSearchOpen(false);
                            }
                          } else {
                            setFormData(prev => ({ ...prev, cus_id: '' }));
                            if (typeof setCustomerSearchTerm === 'function') setCustomerSearchTerm('');
                            setFormSelectedCustomer(null);

                            // Cleanup for returns
                            if (purchaseType === 'return') {
                              setPurchaseSearchResults([]);
                              setSelectedPurchaseForReturn(null);
                            }
                          }
                          setCustomerDropdownOpen(false);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select supplier..."
                            onFocus={(e) => e.target.select()}
                            sx={{
                              width: '100%',
                              minWidth: 200,
                              minHeight: 56,
                              '& .MuiInputBase-input': {
                                fontWeight: formSelectedCustomer ? 'bold' : 'normal'
                              }
                            }}
                          />
                        )}
                        renderOption={(props, option) => {
                          const { key, ...optionProps } = props;
                          return (
                            <Box component="li" key={key} {...optionProps}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <PersonIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: formSelectedCustomer?.cus_id === option.cus_id ? 'bold' : 'medium',
                                      color: formSelectedCustomer?.cus_id === option.cus_id ? 'primary.main' : 'text.primary'
                                    }}
                                  >
                                    {option.cus_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.cus_phone_no} • Balance: {parseFloat(option.cus_balance || 0).toFixed(2)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          );
                        }}
                        sx={{ width: '100%' }}
                        disablePortal={false}
                        openOnFocus={true}
                        selectOnFocus={true}
                        autoSelect={true}
                        clearOnBlur={false}
                        handleHomeEndKeys={true}
                      />
                    </Box>
                  </Grid>

                  {/* Select Purchase to Return (Only for Return) */}
                  {purchaseType === 'return' && (
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          SELECT PURCHASE
                        </Typography>
                        <Autocomplete
                          open={purchaseSearchOpen}
                          onOpen={() => {
                            setPurchaseSearchOpen(true);
                            // Show all purchases when opening dropdown
                            if (formSelectedCustomer) {
                              const supplierPurchases = purchases.filter(p => p.cus_id === formSelectedCustomer.cus_id);
                              setPurchaseSearchResults(supplierPurchases);
                            }
                          }}
                          onClose={() => setPurchaseSearchOpen(false)}
                          options={purchaseSearchResults}
                          getOptionLabel={(option) => `#${option.pur_id} - ${option.invoice_number || 'N/A'} (${parseFloat(option.total_amount).toFixed(2)})`}
                          value={selectedPurchaseForReturn}
                          onChange={(event, newValue) => {
                            if (newValue) {
                              handleLoadPurchaseForReturn(newValue);
                            }
                          }}
                          onInputChange={(event, inputValue) => {
                            handlePurchaseSearch(inputValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Search invoice..."
                              size="medium"
                              sx={{
                                width: '100%',
                                minHeight: 56,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 1,
                                  '& fieldset': { borderColor: '#e5e7eb' },
                                  '&:hover fieldset': { borderColor: '#dc2626' },
                                  '&.Mui-focused fieldset': { borderColor: '#b91c1c' }
                                }
                              }}
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary' }} />
                                  </InputAdornment>
                                )
                              }}
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...optionProps } = props;
                            return (
                              <Box component="li" key={key} {...optionProps}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                  <ReceiptIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {option.invoice_number || 'N/A'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {parseFloat(option.total_amount).toFixed(2)} • {new Date(option.created_at).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          }}
                          sx={{ width: '100%' }}
                          disablePortal={false}
                          openOnFocus={true}
                          selectOnFocus={true}
                          autoSelect={true}
                          clearOnBlur={true}
                          noOptionsText={purchaseSearchResults.length === 0 ? "No purchases found" : ""}
                        />
                      </Box>
                    </Grid>
                  )}

                  {/* Date Field */}
                  <Grid size={{ xs: 12, md: purchaseType === 'new' ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        DATE
                      </Typography>
                      <TextField
                        size="medium"
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        onFocus={(e) => e.target.select()}
                        sx={{ width: '100%', minHeight: 56 }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <CalendarIcon sx={{ color: 'warning.main' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* Invoice Number Field */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {purchaseType === 'new' ? 'INVOICE NUMBER' : 'NEW INVOICE NUMBER (RETURN)'}
                      </Typography>
                      <TextField
                        size="medium"
                        placeholder={purchaseType === 'new' ? 'Enter invoice number' : 'Enter return invoice number'}
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        sx={{ width: '100%', minHeight: 56 }}
                      />
                    </Box>
                  </Grid>

                  {/* Row 2 - Vehicle (only for new purchases) */}
                  {purchaseType === 'new' && (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            VEHICLE
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                            *
                          </Typography>
                        </Box>
                        <Autocomplete
                          size="medium"
                          open={vehicleDropdownOpen}
                          onOpen={() => setVehicleDropdownOpen(true)}
                          onClose={() => setVehicleDropdownOpen(false)}
                          options={vehicles}
                          getOptionLabel={(option) => `${option.vehicle_no} - ${option.driver_name}`}
                          value={vehicles.find(v => v.vehicle_no === formData.vehicle_no) || null}
                          onChange={(event, newValue) => {
                            setFormData(prev => ({
                              ...prev,
                              vehicle_no: newValue ? newValue.vehicle_no : ''
                            }));
                            setVehicleDropdownOpen(false);
                          }}
                          filterOptions={(options, { inputValue }) => {
                            return options.filter(option =>
                              option.vehicle_no.toLowerCase().includes(inputValue.toLowerCase()) ||
                              option.driver_name.toLowerCase().includes(inputValue.toLowerCase()) ||
                              option.vehicle_type.toLowerCase().includes(inputValue.toLowerCase())
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select vehicle..."
                              onFocus={(e) => e.target.select()}
                              sx={{ width: '100%', minWidth: 300, minHeight: 56 }}
                              required
                            />
                          )}
                          sx={{ width: '100%', minWidth: 300 }}
                          disablePortal={false}
                          openOnFocus={true}
                          selectOnFocus={true}
                          autoSelect={true}
                          clearOnBlur={false}
                          handleHomeEndKeys={true}
                        />
                      </Box>
                    </Grid>
                  )}




                </Grid>
              </Box>


              {/* Product Selection Section */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  SELECT PRODUCT
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={9}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        STORE
                      </Typography>
                      <Autocomplete
                        size="small"
                        options={stores}
                        getOptionLabel={(option) => option.store_name}
                        value={stores.find(store => store.storeid === parseInt(formData.store_id)) || null}
                        onChange={(event, newValue) => {
                          setFormData(prev => ({
                            ...prev,
                            store_id: newValue ? newValue.storeid.toString() : ''
                          }));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={formData.store_id ? "Store Selected" : "Select store"}
                            onFocus={(e) => e.target.select()}
                            sx={{
                              width: '100%',
                              minWidth: 200,
                              '& .MuiInputBase-input': {
                                fontWeight: formData.store_id ? 'bold' : 'normal',
                                color: formData.store_id ? 'primary.main' : 'text.primary'
                              }
                            }}
                          />
                        )}
                        renderOption={(props, option) => {
                          const { key, ...optionProps } = props;
                          return (
                            <Box component="li" key={key} {...optionProps}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StoreIcon sx={{ color: 'primary.main' }} />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: formData.store_id === option.storeid.toString() ? 'bold' : 'medium',
                                      color: formData.store_id === option.storeid.toString() ? 'primary.main' : 'text.primary'
                                    }}
                                  >
                                    {option.store_name}
                                  </Typography>
                                  {option.store_address && (
                                    <Typography variant="caption" color="text.secondary">
                                      {option.store_address}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          );
                        }}
                        disablePortal={false}
                        openOnFocus={true}
                        selectOnFocus={true}
                        autoSelect={true}
                        sx={{
                          width: '100%',
                          minWidth: 200,
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        PRODUCT
                      </Typography>
                      <Autocomplete
                        options={products}
                        getOptionLabel={(option) => option.pro_title}
                        value={selectedProduct}
                        onChange={(event, newValue) => {
                          if (newValue) {
                            handleProductSelect(newValue);
                          }
                        }}
                        filterOptions={(options, { inputValue }) => {
                          return options.filter(option =>
                            option.pro_title.toLowerCase().includes(inputValue.toLowerCase()) ||
                            option.category?.cat_name?.toLowerCase().includes(inputValue.toLowerCase()) ||
                            option.sub_category?.sub_cat_name?.toLowerCase().includes(inputValue.toLowerCase())
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select product..."
                            size="small"
                            onFocus={(e) => e.target.select()}
                            sx={{ width: '100%', minWidth: 300 }}
                          />
                        )}
                        sx={{ width: '100%', minWidth: 300 }}
                        openOnFocus={true}
                        selectOnFocus={true}
                        autoSelect={true}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        QTY
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={productFormData.qnty}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, qnty: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ min: 1 }}
                        sx={{ width: '100%' }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={1.5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        RATE
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={productFormData.unit_rate}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, unit_rate: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ step: 0.01, min: 0 }}
                        sx={{ width: '100%' }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={1.5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        CRATE
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={productFormData.crate || productFormData.unit_rate}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, crate: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ step: 0.01, min: 0 }}
                        sx={{ width: 100, minWidth: 100 }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={1.5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        AMOUNT
                      </Typography>
                      <TextField
                        size="small"
                        value={(parseFloat(productFormData.qnty || 0) * parseFloat(productFormData.crate || productFormData.unit_rate || 0)).toFixed(2)}
                        InputProps={{ readOnly: true }}
                        sx={{ width: '100%', minWidth: 150 }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={1.5}>
                    <Button
                      variant="contained"
                      id="add-product-btn"
                      onClick={addProductToPurchase}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          addProductToPurchase();
                          // Move focus back to product search
                          const productInput = document.querySelector('input[placeholder*="Select product"]');
                          if (productInput) productInput.focus();
                        }
                      }}
                      disabled={!productFormData.qnty || !productFormData.unit_rate}
                      sx={{
                        bgcolor: 'secondary.main',
                        '&:hover': { bgcolor: 'secondary.dark' },
                        minWidth: 40,
                        height: 40
                      }}
                    >
                      +
                    </Button>
                  </Grid>
                </Grid>
              </Box>


              {/* Product List Table */}
              <Box sx={{ flex: 1, p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>S. No</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Product</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Store</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Qty</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Price</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Crate</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.purchase_details.length > 0 ? (
                        formData.purchase_details.map((detail, index) => {
                          const product = products.find(p => p.pro_id === detail.pro_id);
                          return (
                            <TableRow key={index} hover>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {product?.pro_title || 'Unknown Product'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <StoreIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                    {stores.find(store => store.storeid === parseInt(detail.store_id))?.store_name || 'Unknown Store'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  value={detail.qnty}
                                  onChange={(e) => {
                                    const newQuantity = e.target.value;
                                    const updatedDetails = formData.purchase_details.map((d, i) =>
                                      i === index
                                        ? {
                                          ...d,
                                          qnty: newQuantity,
                                          total_amount: (parseInt(newQuantity) * parseFloat(d.unit_rate)).toString()
                                        }
                                        : d
                                    );
                                    setFormData(prev => ({ ...prev, purchase_details: updatedDetails }));
                                  }}
                                  inputProps={{ min: 1 }}
                                  size="small"
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  value={detail.unit_rate}
                                  onChange={(e) => {
                                    const newUnitRate = e.target.value;
                                    const updatedDetails = formData.purchase_details.map((d, i) =>
                                      i === index
                                        ? {
                                          ...d,
                                          unit_rate: newUnitRate,
                                          total_amount: (parseInt(d.qnty) * parseFloat(d.crate || newUnitRate)).toString()
                                        }
                                        : d
                                    );
                                    setFormData(prev => ({ ...prev, purchase_details: updatedDetails }));
                                  }}
                                  inputProps={{ step: 0.01, min: 0 }}
                                  size="small"
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  value={detail.crate || detail.unit_rate || '0'}
                                  onChange={(e) => {
                                    const newCrate = e.target.value;
                                    const updatedDetails = formData.purchase_details.map((d, i) =>
                                      i === index
                                        ? {
                                          ...d,
                                          crate: newCrate,
                                          total_amount: (parseInt(d.qnty) * parseFloat(newCrate)).toString()
                                        }
                                        : d
                                    );
                                    setFormData(prev => ({ ...prev, purchase_details: updatedDetails }));
                                  }}
                                  inputProps={{ step: 0.01, min: 0 }}
                                  size="small"
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 'semibold', color: 'success.main' }}>
                                  {parseFloat(detail.total_amount).toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={() => removePurchaseDetail(index)}
                                  color="error"
                                  size="small"
                                  title="Remove Product"
                                >
                                  <CloseIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No data found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Payment and Summary Section */}
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  {/* Left Section - Payment Fields */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Split Payment Section */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          CASH PAYMENT
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={formData.cash_payment}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, cash_payment: e.target.value }));
                          }}
                          inputProps={{ step: 0.01, min: 0 }}
                          sx={{ width: '100%' }}
                          placeholder="Enter amount"
                        />
                      </Box>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          BANK PAYMENT
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={formData.bank_payment}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, bank_payment: e.target.value }));
                          }}
                          inputProps={{ step: 0.01, min: 0 }}
                          sx={{ width: '100%' }}
                          placeholder="Enter amount"
                        />
                      </Box>
                      <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          BANK ACCOUNT
                        </Typography>
                        <Autocomplete
                          size="small"
                          disabled={parseFloat(formData.bank_payment || 0) <= 0}
                          open={bankAccountDropdownOpen}
                          onOpen={() => {
                            console.log('🏦 Opening bank account dropdown');
                            console.log('   Bank accounts available:', bankAccounts.length);
                            console.log('   Bank account data:', bankAccounts.map(b => ({ id: b.cus_id, name: b.cus_name, type_id: b.cus_type })));
                            console.log('   All customers:', customers.length);
                            setBankAccountDropdownOpen(true);
                          }}
                          onClose={() => setBankAccountDropdownOpen(false)}
                          options={bankAccounts.length > 0 ? bankAccounts : customers}
                          getOptionLabel={(option) => option.cus_name}
                          value={selectedBankAccount}
                          onChange={(event, newValue) => {
                            setSelectedBankAccount(newValue);
                            setFormData(prev => ({
                              ...prev,
                              credit_account_id: newValue ? newValue.cus_id.toString() : ''
                            }));
                            setBankAccountDropdownOpen(false);
                          }}
                          filterOptions={(options, { inputValue }) => {
                            return options.filter(option =>
                              option.cus_name.toLowerCase().includes(inputValue.toLowerCase()) ||
                              option.cus_phone_no?.toLowerCase().includes(inputValue.toLowerCase())
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select Bank Account"
                              onFocus={(e) => e.target.select()}
                              sx={
                                {
                                  '& .MuiInputBase-input': {
                                    fontWeight: selectedBankAccount ? 'bold' : 'normal'
                                  }
                                }
                              }
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...optionProps } = props;
                            return (
                              <Box component="li" key={key} {...optionProps}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                  <AttachMoneyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: selectedBankAccount?.cus_id === option.cus_id ? 'bold' : 'medium',
                                        color: selectedBankAccount?.cus_id === option.cus_id ? 'primary.main' : 'text.primary'
                                      }}
                                    >
                                      {option.cus_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {option.cus_phone_no} • Balance: {parseFloat(option.cus_balance || 0).toFixed(2)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          }}
                          sx={{ width: '100%' }}
                          disablePortal={false}
                          openOnFocus={true}
                          selectOnFocus={true}
                          autoSelect={true}
                          clearOnBlur={false}
                          handleHomeEndKeys={true}
                        />
                      </Box>
                    </Box>

                    {/* Row 2: TOTAL PAYMENT, NOTES */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          TOTAL PAYMENT
                        </Typography>
                        <TextField
                          size="small"
                          value={(parseFloat(formData.cash_payment || 0) + parseFloat(formData.bank_payment || 0)).toFixed(2)}
                          InputProps={{ readOnly: true }}
                          sx={{ width: '100%', backgroundColor: 'action.hover' }}
                        />
                      </Box>
                      <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          NOTES
                        </Typography>
                        <TextField
                          size="small"
                          multiline
                          rows={2}
                          placeholder="Additional notes"
                          sx={{ width: '100%' }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Right Section - Summary Fields */}
                  <Box sx={{ width: 350, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* SUBTOTAL */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        SUBTOTAL
                      </Typography>
                      <TextField
                        size="small"
                        value={calculateTotalAmount().toFixed(2)}
                        InputProps={{ readOnly: true }}
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* DELIVERY CHARGES */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        DELIVERY CHARGES
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={formData.transport_amount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, transport_amount: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ step: 0.01, min: 0 }}
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* LABOUR */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        LABOUR
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={formData.labour_amount || ''}
                        onChange={(e) => {
                          const newLabourAmount = e.target.value;
                          setFormData(prev => {
                            const updatedDetails = handleLabourDistribution(
                              prev.include_labour,
                              newLabourAmount,
                              prev.purchase_details
                            );
                            return {
                              ...prev,
                              labour_amount: newLabourAmount,
                              purchase_details: updatedDetails
                            };
                          });
                        }}
                        inputProps={{ step: 0.01, min: 0 }}
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* Include Labour Charges Checkbox */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', py: 0.5 }}>
                      <Checkbox
                        checked={formData.include_labour || false}
                        onChange={(e) => {
                          const newIncludeLabour = e.target.checked;
                          console.log('🔧 Checkbox changed:', {
                            newIncludeLabour,
                            labourAmount: formData.labour_amount,
                            purchaseDetailsLength: formData.purchase_details.length
                          });
                          setFormData(prev => {
                            const updatedDetails = handleLabourDistribution(
                              newIncludeLabour,
                              prev.labour_amount,
                              prev.purchase_details
                            );
                            console.log('🔧 Updated details:', updatedDetails);
                            return {
                              ...prev,
                              include_labour: newIncludeLabour,
                              purchase_details: updatedDetails
                            };
                          });
                        }}
                        size="small"
                        sx={{ py: 0 }}
                      />
                      <Typography variant="body2">
                        Include Labour Charges
                      </Typography>
                    </Box>

                    {/* DISCOUNT */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        DISCOUNT
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={formData.discount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ step: 0.01, min: 0 }}
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* GRAND TOTAL */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        GRAND TOTAL
                      </Typography>
                      <TextField
                        size="small"
                        value={calculateNetTotal().toFixed(2)}
                        InputProps={{ readOnly: true }}
                        sx={{
                          width: 150,
                          '& .MuiInputBase-input': {
                            fontWeight: 'bold',
                            color: 'primary.main',
                            fontSize: '1.1rem'
                          }
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {/* TOTAL PAYMENT */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        TOTAL PAYMENT
                      </Typography>
                      <TextField
                        size="small"
                        value={(parseFloat(formData.cash_payment || 0) + parseFloat(formData.bank_payment || 0)).toFixed(2)}
                        InputProps={{ readOnly: true }}
                        sx={{ width: 150, backgroundColor: 'action.hover' }}
                      />
                    </Box>

                    {/* BALANCE */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        BALANCE
                      </Typography>
                      <TextField
                        size="small"
                        value={(calculateNetTotal() - (parseFloat(formData.cash_payment || 0) + parseFloat(formData.bank_payment || 0))).toFixed(2)}
                        InputProps={{ readOnly: true }}
                        sx={{ width: 150 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Form Actions */}
              <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  variant="outlined"
                  tabIndex={-1}
                  sx={{ px: 3, py: 1.5 }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="contained"
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      // Trigger form submission
                      const form = e.target.closest('form');
                      if (form) form.requestSubmit();
                    }
                  }}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                  sx={{
                    px: 4,
                    py: 1.5,
                    bgcolor: 'secondary.main',
                    '&:hover': { bgcolor: 'secondary.dark' }
                  }}
                >
                  {isSubmitting ? (editingPurchase ? 'Updating...' : 'Creating...') : (editingPurchase ? 'Update Purchase' : 'Save')}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </div>
    </DashboardLayout>
  );

  return (
    <>
      {currentView === 'list' ? renderPurchaseListView() : renderPurchaseCreateView()}


      {/* Add Customer Modal */}
      <Dialog
        open={showCustomerForm}
        onClose={handleCloseCustomerForm}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: 'secondary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'secondary.main' }}>
              <AddIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Add New Supplier
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create a new supplier account with complete details
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleCloseCustomerForm}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ my: 2 }}>
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
                  startIcon={<LocationOnIcon />}
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
              {/* Row 1: Name, Primary Phone, Secondary Phone */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Account Name"
                  name="cus_name"
                  value={customerFormData.cus_name}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter account name"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
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
                  value={customerFormData.cus_phone_no}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter primary phone number"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
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
                  value={customerFormData.cus_phone_no2}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter secondary phone number"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Row 2: Address, Account Type, Category */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Address"
                  name="cus_address"
                  value={customerFormData.cus_address}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter complete address"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Autocomplete
                  fullWidth
                  required
                  size="medium"
                  options={[
                    { id: '', title: 'Select a type' },
                    ...customerTypes.map(type => ({
                      id: type.cus_type_id,
                      title: type.cus_type_title
                    }))
                  ]}
                  value={(() => {
                    const options = [
                      { id: '', title: 'Select a type' },
                      ...customerTypes.map(type => ({
                        id: type.cus_type_id,
                        title: type.cus_type_title
                      }))
                    ];
                    return options.find(option => option.id === customerFormData.cus_type) || { id: '', title: 'Select a type' };
                  })()}
                  onChange={(event, newValue) => {
                    setCustomerFormData(prev => ({
                      ...prev,
                      cus_type: newValue ? newValue.id : ''
                    }));
                  }}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Account Type"
                      sx={{ minHeight: 56, minWidth: 255 }}
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
                  required
                  size="medium"
                  options={[
                    { id: '', title: 'Select a category' },
                    ...customerCategories.map(category => ({
                      id: category.cus_cat_id,
                      title: category.cus_cat_title
                    }))
                  ]}
                  value={(() => {
                    const options = [
                      { id: '', title: 'Select a category' },
                      ...customerCategories.map(category => ({
                        id: category.cus_cat_id,
                        title: category.cus_cat_title
                      }))
                    ];
                    return options.find(option => option.id === customerFormData.cus_category) || { id: '', title: 'Select a category' };
                  })()}
                  onChange={(event, newValue) => {
                    setCustomerFormData(prev => ({
                      ...prev,
                      cus_category: newValue ? newValue.id : ''
                    }));
                  }}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Supplier Category"
                      sx={{ minHeight: 56, minWidth: 255 }}
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

              {/* Row 3: City, Reference, Account Info */}
              <Grid item xs={12} md={4}>
                <Autocomplete
                  fullWidth
                  size="medium"
                  options={[
                    { id: '', title: 'Select a city' },
                    ...cities.map(city => ({
                      id: city.city_id,
                      title: city.city_name
                    }))
                  ]}
                  value={(() => {
                    const options = [
                      { id: '', title: 'Select a city' },
                      ...cities.map(city => ({
                        id: city.city_id,
                        title: city.city_name
                      }))
                    ];
                    return options.find(option => option.id === customerFormData.city_id) || { id: '', title: 'Select a city' };
                  })()}
                  onChange={(event, newValue) => {
                    setCustomerFormData(prev => ({
                      ...prev,
                      city_id: newValue ? newValue.id : ''
                    }));
                  }}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="City"
                      sx={{ minHeight: 56, minWidth: 255 }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <MapPinIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Reference"
                  name="cus_reference"
                  value={customerFormData.cus_reference}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter reference"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
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
                  label="Account Info"
                  name="cus_account_info"
                  value={customerFormData.cus_account_info}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter account information"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Row 4: CNIC, NTN Number, Name in Urdu */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="CNIC"
                  name="CNIC"
                  value={customerFormData.CNIC}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter CNIC number"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
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
                  label="NTN Number"
                  name="NTN_NO"
                  value={customerFormData.NTN_NO}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter NTN number"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
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
                  label="Name in Urdu"
                  name="name_urdu"
                  value={customerFormData.name_urdu}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter name in Urdu"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Row 5: Opening Balance, Other Information */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Opening Balance"
                  name="cus_balance"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  value={customerFormData.cus_balance}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter opening balance"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
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
                  value={customerFormData.other}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter other information"
                  size="medium"
                  sx={{ minHeight: 56, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={handleCloseCustomerForm}
            variant="outlined"
            sx={{ px: 3, py: 1.5 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddCustomer}
            variant="contained"
            disabled={isSubmittingCustomer}
            startIcon={isSubmittingCustomer ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: 'secondary.main',
              '&:hover': { bgcolor: 'secondary.dark' }
            }}
          >
            {isSubmittingCustomer ? 'Adding...' : 'Add Supplier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Purchase Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <ReceiptIcon />
          Purchase Receipt - #{viewingPurchase?.sequentialId || viewingPurchase?.pur_id}
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '80vh', overflow: 'auto' }}>
          {viewingPurchase && (
            <Box id="purchase-invoice" sx={{ width: '100%', bgcolor: 'white', p: 3, mt: 2 }}>
              {/* Company Header */}
              <Box sx={{ textAlign: 'center', py: 2, borderBottom: '2px solid #000' }}>
                <Typography variant="h5" sx={{
                  fontWeight: 'bold',
                  mb: 1,
                  fontFamily: 'Arial, sans-serif',
                  direction: 'rtl'
                }}>
                  اتفاق آئرن اینڈ سیمنٹ سٹور
                </Typography>
                <Typography variant="body2" sx={{
                  mb: 1,
                  direction: 'rtl'
                }}>
                  گجرات سرگودھا روڈ، پاہڑیانوالی
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <PhoneIcon sx={{ color: '#25D366', fontSize: '1rem' }} />
                  <Typography variant="body2">
                    Ph:- 0346-7560306, 0300-7560306
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  mt: 1
                }}>
                  PURCHASE INVOICE
                </Typography>
              </Box>

              {/* Customer and Invoice Details */}
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Supplier Name: <strong>{viewingPurchase.customer?.cus_name || 'N/A'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Phone No: <strong>{viewingPurchase.customer?.cus_phone_no || 'N/A'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Address: <strong>{viewingPurchase.customer?.cus_address || 'N/A'}</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Invoice No: <strong>#{viewingPurchase.pur_id}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Time: <strong>{new Date(viewingPurchase.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Date: <strong>{new Date(viewingPurchase.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                  </Typography>
                  {viewingPurchase.vehicle_no && (
                    <Typography variant="body2">
                      Vehicle No: <strong>{viewingPurchase.vehicle_no}</strong>
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Product Table */}
              <Box sx={{ px: 3, py: 2 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#9e9e9e' }}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }}>S#</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }}>Product Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }} align="right">Qty</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }} align="right">Rate</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }} align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewingPurchase.purchase_details && viewingPurchase.purchase_details.length > 0 ? (
                        viewingPurchase.purchase_details.map((detail, index) => (
                          <TableRow key={detail.pur_detail_id || index}>
                            <TableCell sx={{ px: 1 }}>{index + 1}</TableCell>
                            <TableCell sx={{ px: 1 }}>{detail.product?.pro_title || detail.pro_title || 'N/A'}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{detail.qnty || 0}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.unit_rate || detail.rate || 0).toFixed(2)}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.total_amount || detail.amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            No items found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Payment Summary */}
                <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: '0 0 48%' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, border: '1px solid #000', width: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>سابقہ بقایا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {parseFloat(viewingPurchase.customer?.cus_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>موجودہ بقایا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {(parseFloat(viewingPurchase.total_amount || 0) - parseFloat(viewingPurchase.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>کل بقایا</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {(parseFloat(viewingPurchase.customer?.cus_balance || 0) + parseFloat(viewingPurchase.total_amount || 0) - parseFloat(viewingPurchase.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                  <Box sx={{ flex: '0 0 48%', display: 'flex', justifyContent: 'flex-end' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000', width: '100%', maxWidth: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کل مال کی رقم</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(viewingPurchase.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>مزدوری</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(viewingPurchase.labour_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>ٹرانسپورٹ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(viewingPurchase.transport_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کرایہ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(viewingPurchase.fare_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>اتارنے کا خرچ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(viewingPurchase.unloading_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {parseFloat(viewingPurchase.discount || 0) > 0 && (
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>رعایت/ڈسکاؤنٹ</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                -{parseFloat(viewingPurchase.discount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کل بل کی رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {(viewingPurchase.display_net_total || parseFloat(viewingPurchase.total_amount || 0) + parseFloat(viewingPurchase.unloading_amount || 0) + parseFloat(viewingPurchase.transport_amount || 0) + parseFloat(viewingPurchase.labour_amount || 0) + parseFloat(viewingPurchase.fare_amount || 0) - parseFloat(viewingPurchase.discount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>نقد ادائیگی</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem', fontWeight: 'bold' }}>
                              {parseFloat(viewingPurchase.cash_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {viewingPurchase.bank_payment > 0 ? (viewingPurchase.bank_title || 'بینک ادائیگی') : 'بینک ادائیگی'}
                            </TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem', fontWeight: 'bold' }}>
                              {parseFloat(viewingPurchase.bank_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کل ادائیگی</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(viewingPurchase.payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>باقی رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {((viewingPurchase.display_net_total || parseFloat(viewingPurchase.total_amount || 0) + parseFloat(viewingPurchase.unloading_amount || 0) + parseFloat(viewingPurchase.transport_amount || 0) + parseFloat(viewingPurchase.labour_amount || 0) + parseFloat(viewingPurchase.fare_amount || 0) - parseFloat(viewingPurchase.discount || 0)) - parseFloat(viewingPurchase.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog} variant="outlined">
            Close
          </Button>
          {viewingPurchase && (
            <Button
              onClick={() => {
                handleCloseViewDialog();
                handleEdit(viewingPurchase);
              }}
              variant="contained"
              startIcon={<EditIcon />}
            >
              Edit Purchase
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Account Category Popup */}
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
                Create a new account category
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
          <Box component="form" sx={{ mt: 2 }}>
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
            onClick={handleAddCustomerCategory}
            disabled={isAddingCustomerCategory}
            sx={{
              background: 'linear-gradient(45deg, #4caf50 30%, #2e7d32 90%)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #388e3c 30%, #1b5e20 90%)',
              }
            }}
          >
            {isAddingCustomerCategory ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Type Popup */}
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
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Add Account Type
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create a new account type
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
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Account Type Title"
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
            onClick={handleAddCustomerType}
            disabled={isAddingCustomerType}
            sx={{
              background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2 30%, #7b1fa2 90%)',
              }
            }}
          >
            {isAddingCustomerType ? 'Adding...' : 'Add Type'}
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
              <MapPinIcon />
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
          <Box component="form" sx={{ mt: 2 }}>
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
            onClick={handleAddCity}
            disabled={isAddingCity}
            sx={{
              background: 'linear-gradient(45deg, #ff9800 30%, #f57c00 90%)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #f57c00 30%, #ef6c00 90%)',
              }
            }}
          >
            {isAddingCity ? 'Adding...' : 'Add City'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <ReceiptIcon />
          Purchase Receipt Preview
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '80vh', overflow: 'auto' }}>
          {currentBillData && (
            <Box id="receipt-preview" sx={{ width: '100%', bgcolor: 'white', p: 3, mt: 2 }}>
              {/* Company Header */}
              <Box sx={{ textAlign: 'center', py: 2, borderBottom: '2px solid #000' }}>
                <Typography variant="h5" sx={{
                  fontWeight: 'bold',
                  mb: 1,
                  fontFamily: 'Arial, sans-serif',
                  direction: 'rtl'
                }}>
                  اتفاق آئرن اینڈ سیمنٹ سٹور
                </Typography>
                <Typography variant="body2" sx={{
                  mb: 1,
                  direction: 'rtl'
                }}>
                  گجرات سرگودھا روڈ، پاہڑیانوالی
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <PhoneIcon sx={{ color: '#25D366', fontSize: '1rem' }} />
                  <Typography variant="body2">
                    Ph:- 0346-7560306, 0300-7560306
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  mt: 1
                }}>
                  PURCHASE INVOICE
                </Typography>
              </Box>

              {/* Customer and Invoice Details */}
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Customer Name: <strong>{currentBillData.customer?.cus_name || 'N/A'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Phone No: <strong>{currentBillData.customer?.cus_phone_no || 'N/A'}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Address: <strong>{currentBillData.customer?.cus_address || 'N/A'}</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Invoice No: <strong>#{currentBillData.pur_id}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Time: <strong>{new Date(currentBillData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Date: <strong>{new Date(currentBillData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Bill Type: <strong>{currentBillData.bill_type || 'PURCHASE'}</strong>
                  </Typography>
                </Box>
              </Box>

              {/* Product Table and Payment Summary - Full Width */}
              <Box sx={{ px: 3, py: 2 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#9e9e9e' }}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }}>S#</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }}>Product Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }} align="right">Qty</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }} align="right">Rate</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white', py: 1, px: 1 }} align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentBillData.purchase_details && currentBillData.purchase_details.length > 0 ? (
                        currentBillData.purchase_details.map((detail, index) => (
                          <TableRow key={detail.pur_detail_id || index}>
                            <TableCell sx={{ px: 1 }}>{index + 1}</TableCell>
                            <TableCell sx={{ px: 1 }}>{detail.product?.pro_title || detail.pro_title || 'N/A'}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{detail.qnty || 0}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.unit_rate || detail.rate || 0).toFixed(2)}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.total_amount || detail.amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            No items found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Payment Summary */}
                <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: '0 0 48%' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, border: '1px solid #000', width: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>سابقہ بقایا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {parseFloat(currentBillData.customer?.cus_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>موجوده بقايا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {(parseFloat(currentBillData.total_amount || 0) - parseFloat(currentBillData.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>كل بقايا</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {(parseFloat(currentBillData.customer?.cus_balance || 0) + parseFloat(currentBillData.total_amount || 0) - parseFloat(currentBillData.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {currentBillData.notes && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          <strong>Notes:</strong> {currentBillData.notes}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: '0 0 48%', display: 'flex', justifyContent: 'flex-end' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000', width: '100%', maxWidth: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>رقم بل</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>مزدوری</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.labour_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کرایہ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {(parseFloat(currentBillData.fare_amount || 0) + parseFloat(currentBillData.transport_amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {parseFloat(currentBillData.discount || 0) > 0 && (
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>رعایت/ڈسکاؤنٹ</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                -{parseFloat(currentBillData.discount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {(parseFloat(currentBillData.total_amount || 0) + parseFloat(currentBillData.unloading_amount || 0) + parseFloat(currentBillData.transport_amount || 0) + parseFloat(currentBillData.labour_amount || 0) + parseFloat(currentBillData.fare_amount || 0) - parseFloat(currentBillData.discount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {/* Always show cash payment */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>نقد كيش</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.cash_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {/* Always show bank payment row */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              بینک پیمنٹ
                            </TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.bank_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {/* Remove payment breakdown summary */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم وصول</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>بقايا رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {((parseFloat(currentBillData.total_amount || 0) + parseFloat(currentBillData.unloading_amount || 0) + parseFloat(currentBillData.transport_amount || 0) + parseFloat(currentBillData.labour_amount || 0) + parseFloat(currentBillData.fare_amount || 0) - parseFloat(currentBillData.discount || 0)) - parseFloat(currentBillData.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
          <Button
            onClick={() => setReceiptDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <CircularProgress />
        </div>
      </DashboardLayout>
    }>
      <PurchasesPageContent />
    </Suspense>
  );
}