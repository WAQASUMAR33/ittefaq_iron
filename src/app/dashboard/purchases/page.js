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
  AlertCircle as AlertCircleIcon,
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
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

export default function PurchasesPage() {
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
  const filterCustomersByType = (customers, customerTypes) => {
    // Find supplier and bank account types
    const supplierType = customerTypes.find(type => 
      type.cus_type_title.toLowerCase() === 'supplier'
    );
    const bankAccountType = customerTypes.find(type => 
      type.cus_type_title.toLowerCase() === 'cash account'
    );
    
    // Filter customers by type
    const filteredSuppliers = customers.filter(customer => 
      customer.cus_type === supplierType?.cus_type_id
    );
    
    const filteredBankAccounts = customers.filter(customer => 
      customer.cus_type === bankAccountType?.cus_type_id
    );
    
    console.log(`🔍 Filtered ${filteredSuppliers.length} suppliers and ${filteredBankAccounts.length} bank accounts`);
    
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
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
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
  
  // Selected product for preview
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    qnty: '1',
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

  // Filter customers by type when both customers and customerTypes are loaded
  useEffect(() => {
    if (customers.length > 0 && customerTypes.length > 0) {
      console.log('🔍 Filtering customers - customers:', customers.length, 'types:', customerTypes.length);
      const { suppliers, bankAccounts } = filterCustomersByType(customers, customerTypes);
      setSuppliers(suppliers);
      setBankAccounts(bankAccounts);
    } else {
      console.log('🔍 Not filtering yet - customers:', customers.length, 'types:', customerTypes.length);
    }
  }, [customers, customerTypes]);

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
    
    return matchesSearch && matchesCustomer;
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
      
      if (formData.purchase_details.length === 0) {
        alert('Please add at least one product to the purchase');
        return;
      }
      
      const url = editingPurchase ? '/api/purchases' : '/api/purchases';
      const method = editingPurchase ? 'PUT' : 'POST';
      
      // Calculate total amount from purchase details
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
            bank_payment: bankPayment
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
            bank_payment: bankPayment
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
        await fetchData();
        setCurrentView('list');
        setEditingPurchase(null);
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
        message: 'Customer name is required',
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
        message: 'Customer category is required',
        severity: 'error'
      });
      return;
    }
    if (!customerFormData.cus_type) {
      setSnackbar({
        open: true,
        message: 'Customer type is required',
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
          message: 'Customer added successfully',
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
          message: 'Error adding customer',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      setSnackbar({
        open: true,
        message: 'Error adding customer',
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
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Search"
                    placeholder="Search purchases..."
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

              {/* Customer Filter */}
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    fullWidth
                    options={[{ cus_id: '', cus_name: 'All Customers' }, ...customers]}
                    getOptionLabel={(option) => option.cus_name}
                    value={customers.find(c => c.cus_id === selectedCustomer) || { cus_id: '', cus_name: 'All Customers' }}
                    onChange={(event, newValue) => {
                      setSelectedCustomer(newValue ? newValue.cus_id : '');
                    }}
                    filterOptions={(options, { inputValue }) => {
                      return options.filter(option =>
                        option.cus_name.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        placeholder="Search customers..."
                        sx={{ minWidth: 300 }}
                      />
                    )}
                    sx={{ minWidth: 300 }}
                  />
                </Grid>

              {/* Sort */}
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    fullWidth
                    options={[
                      { value: 'created_at-desc', label: 'Newest First' },
                      { value: 'created_at-asc', label: 'Oldest First' },
                      { value: 'customer-asc', label: 'Customer A-Z' },
                      { value: 'customer-desc', label: 'Customer Z-A' },
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
                    filterOptions={(options, { inputValue }) => {
                      return options.filter(option =>
                        option.label.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Sort By"
                        placeholder="Select sort option..."
                        sx={{ minWidth: 300 }}
                      />
                    )}
                    sx={{ minWidth: 300 }}
                  />
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
                        background: 'linear-gradient(45deg, #4CAF50 30%, #2E7D32 90%)'
                      }}
                    >
                      <ShoppingCartIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Purchases
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalPurchases}
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
                        background: 'linear-gradient(45deg, #2196F3 30%, #00BCD4 90%)'
                      }}
                    >
                      <ShoppingCartIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Value
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalPurchaseValue.toLocaleString()}
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
                      <TruckIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Unloading Amount
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalUnloadingAmount.toLocaleString()}
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
                      <ReceiptIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Fare Amount
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {totalFareAmount.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

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
                onClick={() => setCurrentView('list')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeftIcon />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingPurchase ? 'Edit Purchase' : 'Create New Purchase'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingPurchase ? 'Update purchase information' : 'Select products and create purchase order'}
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
                Order #
              </Typography>
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
            </Box>
          </Card>

          {/* Main Form */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Customer and Order Details Section */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Grid container spacing={3}>
                  {/* Row 0 - Invoice Number */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        INVOICE NUMBER
                      </Typography>
                      <TextField
                        size="small"
                        placeholder="Enter invoice number"
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                        sx={{ width: '100%' }}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Row 1 */}
                  <Grid item xs={12} md={2}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        DATE
                      </Typography>
                      <TextField
                        size="small"
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        sx={{ width: '100%' }}
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
                  
                  
                  <Grid item xs={12} md={4}>
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
                        size="small"
                        open={customerDropdownOpen}
                        onOpen={() => {
                          console.log('🔍 Opening supplier dropdown, options:', suppliers.length);
                          setCustomerDropdownOpen(true);
                        }}
                        onClose={() => setCustomerDropdownOpen(false)}
                        options={suppliers.length > 0 ? suppliers : customers}
                        getOptionLabel={(option) => option.cus_name}
                        value={formSelectedCustomer}
                        onChange={(event, newValue) => {
                          if (newValue) {
                            selectCustomer(newValue);
                          } else {
                            setFormData(prev => ({ ...prev, cus_id: '' }));
                            setCustomerSearchTerm('');
                            setFormSelectedCustomer(null);
                          }
                          setCustomerDropdownOpen(false);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select supplier..."
                            sx={{ 
                              width: '100%', 
                              minWidth: 300,
                              '& .MuiInputBase-input': {
                                fontWeight: formSelectedCustomer ? 'bold' : 'normal'
                              }
                            }}
                            onClick={() => setCustomerDropdownOpen(true)}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
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
                        )}
                        sx={{ width: '100%', minWidth: 300 }}
                        disablePortal={false}
                        openOnFocus={true}
                        selectOnFocus={true}
                        clearOnBlur={false}
                        handleHomeEndKeys={true}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Row 2 - Vehicle, Transport Amount, Labour Amount */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        VEHICLE
                      </Typography>
                      <Autocomplete
                        size="small"
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
                            sx={{ width: '100%', minWidth: 300 }}
                            onClick={() => setVehicleDropdownOpen(true)}
                          />
                        )}
                        sx={{ width: '100%', minWidth: 300 }}
                        disablePortal={false}
                        openOnFocus={true}
                        selectOnFocus={true}
                        clearOnBlur={false}
                        handleHomeEndKeys={true}
                      />
                    </Box>
                  </Grid>
                  
                  
                  
                  
                  </Grid>
                      </Box>


              {/* Product Selection Section */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  SELECT PRODUCT X
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
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
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
                        )}
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
                            sx={{ width: '100%', minWidth: 300 }}
                          />
                        )}
                        sx={{ width: '100%', minWidth: 300 }}
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={1.5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        QTY
                      </Typography>
                      <TextField
                        size="small"
                            type="number"
                            value={productFormData.qnty}
                            onChange={(e) => setProductFormData(prev => ({ ...prev, qnty: e.target.value }))}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100, minWidth: 100 }}
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
                        inputProps={{ step: 0.01, min: 0 }}
                        sx={{ width: 100, minWidth: 100 }}
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
                          onClick={addProductToPurchase}
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
                          placeholder="0.00"
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
                          placeholder="0.00"
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
                            console.log('🔍 Opening bank account dropdown, options:', bankAccounts.length);
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
                              sx={{ 
                                width: '100%', 
                                '& .MuiInputBase-input': {
                                  fontWeight: selectedBankAccount ? 'bold' : 'normal'
                                }
                              }}
                            onClick={() => setBankAccountDropdownOpen(true)}
                          />
                        )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props}>
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
                          )}
                          sx={{ width: '100%' }}
                        disablePortal={false}
                        openOnFocus={true}
                        selectOnFocus={true}
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
                        {/* TOTAL AMOUNT */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                        TOTAL AMOUNT
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
                            value={formData.transport_amount || '0'}
                            onChange={(e) => setFormData(prev => ({ ...prev, transport_amount: e.target.value }))}
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
                        value={formData.labour_amount || '0'}
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
                            value={formData.discount || '0'}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                            inputProps={{ step: 0.01, min: 0 }}
                            sx={{ width: 150 }}
                          />
                        </Box>

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
                  sx={{ px: 3, py: 1.5 }}
                    >
                      Cancel
                </Button>
                <Button
                      type="submit"
                      disabled={isSubmitting}
                  variant="contained"
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                  sx={{
                    px: 4,
                    py: 1.5,
                    bgcolor: 'secondary.main',
                    '&:hover': { bgcolor: 'secondary.dark' }
                  }}
                >
                  {isSubmitting ? (editingPurchase ? 'Updating...' : 'Creating...') : (editingPurchase ? 'Update Purchase' : 'Create Purchase')}
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
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Row 1: Name, Primary Phone, Secondary Phone */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                          required
                  label="Customer Name"
                  name="cus_name"
                  value={customerFormData.cus_name}
                  onChange={handleCustomerFormChange}
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
                  value={customerFormData.cus_phone_no}
                  onChange={handleCustomerFormChange}
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
                  value={customerFormData.cus_phone_no2}
                  onChange={handleCustomerFormChange}
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

              {/* Row 2: Address, Customer Type, Category */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Address"
                  name="cus_address"
                  multiline
                  rows={2}
                  value={customerFormData.cus_address}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter customer address"
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
                <FormControl fullWidth required sx={{ minWidth: 250 }}>
                  <InputLabel>Customer Type</InputLabel>
                  <Select
                    name="cus_type"
                    value={customerFormData.cus_type}
                    label="Customer Type"
                    onChange={handleCustomerFormChange}
                  >
                    {customerTypes.map(type => (
                      <MenuItem key={type.cus_type_id} value={type.cus_type_id}>
                        {type.cus_type_title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth required sx={{ minWidth: 250 }}>
                  <InputLabel>Customer Category</InputLabel>
                  <Select
                    name="cus_category"
                    value={customerFormData.cus_category}
                    label="Customer Category"
                    onChange={handleCustomerFormChange}
                  >
                    {customerCategories.map(category => (
                      <MenuItem key={category.cus_cat_id} value={category.cus_cat_id}>
                        {category.cus_cat_title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Row 3: Reference, Account Info, CNIC */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Reference"
                  name="cus_reference"
                  value={customerFormData.cus_reference}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter reference"
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
                  label="CNIC"
                  name="CNIC"
                  value={customerFormData.CNIC}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter CNIC number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Row 4: NTN Number, Name in Urdu, City */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="NTN Number"
                  name="NTN_NO"
                  value={customerFormData.NTN_NO}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter NTN number"
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
                <FormControl fullWidth required sx={{ minWidth: 250 }}>
                  <InputLabel>City</InputLabel>
                  <Select
                    name="city_id"
                    value={customerFormData.city_id}
                    label="City"
                    onChange={handleCustomerFormChange}
                  >
                    {cities.map(city => (
                      <MenuItem key={city.city_id} value={city.city_id}>
                        {city.city_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Row 5: Balance, Other Information */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Opening Balance"
                  name="cus_balance"
                          type="number"
                  inputProps={{ step: "0.01" }}
                  value={customerFormData.cus_balance}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter opening balance"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Other Information"
                  name="other"
                  multiline
                  rows={2}
                  value={customerFormData.other}
                  onChange={handleCustomerFormChange}
                  placeholder="Enter other information"
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
    </>
  );
}