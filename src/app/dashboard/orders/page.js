'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
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
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';

import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  AttachMoney as AttachMoneyIcon,
  TrendingDown as TrendingDownIcon,
  CreditCard as CreditCardIcon,
  Inventory as PackageIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  MonetizationOn as MoneyIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  LocationOn as MapPinIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

function OrdersPageContent() {
  const searchParams = useSearchParams();

  // State management
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterBillType, setFilterBillType] = useState('ORDER');
  const [filterStore, setFilterStore] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterBalanceStatus, setFilterBalanceStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Bill view state
  const [viewBillDialog, setViewBillDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [currentView, setCurrentView] = useState('list');

  // Handle URL query parameter for view and type
  useEffect(() => {
    const viewParam = searchParams?.get('view');
    if (viewParam === 'create') {
      setCurrentView('create');
    }

    const typeParam = searchParams?.get('type');
    if (typeParam) {
      setBillType(typeParam);
      setFilterBillType(typeParam);
    } else {
      setBillType('ORDER');
      setFilterBillType('ORDER');
    }
  }, [searchParams]);

  // Sale return state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState(null);
  const [returnFormData, setReturnFormData] = useState({
    sale_id: '',
    cus_id: '',
    total_amount: '',
    discount: '',
    payment: '',
    payment_type: 'CASH',
    debit_account_id: '',
    credit_account_id: '',
    loader_id: '',
    shipping_amount: '',
    bill_type: 'BILL',
    reason: '',
    reference: '',
    return_details: []
  });
  const [debitAccountSearchTerm, setDebitAccountSearchTerm] = useState('');
  const [creditAccountSearchTerm, setCreditAccountSearchTerm] = useState('');

  // Form state for sales creation
  const [formSelectedCustomer, setFormSelectedCustomer] = useState(null);
  const [formSelectedProduct, setFormSelectedProduct] = useState(null);
  const [formSelectedStore, setFormSelectedStore] = useState(null);

  // Product form state
  const [productFormData, setProductFormData] = useState({
    quantity: '',
    rate: '',
    amount: 0,
    stock: 0
  });

  // Product table state
  const [productTableData, setProductTableData] = useState([]);

  // Transport state
  const [transportOptions, setTransportOptions] = useState([]);
  const [transportAccounts, setTransportAccounts] = useState([]);
  const [newTransport, setNewTransport] = useState({
    amount: 0,
    accountId: ''
  });

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState([]);

  // Payment and calculation state
  const [paymentData, setPaymentData] = useState({
    cash: '',
    bank: '',
    bankAccountId: '',
    totalCashReceived: 0,
    discount: '',
    labour: '',
    deliveryCharges: '',
    notes: ''
  });

  // Bill type state
  const [billType, setBillType] = useState('ORDER');

  // Customer creation popup state
  const [customerPopupOpen, setCustomerPopupOpen] = useState(false);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [cities, setCities] = useState([]);

  // Popup states for adding new category, type, and city
  const [showCustomerCategoryPopup, setShowCustomerCategoryPopup] = useState(false);
  const [showCustomerTypePopup, setShowCustomerTypePopup] = useState(false);
  const [showCityPopup, setShowCityPopup] = useState(false);
  const [customerCategoryFormData, setCustomerCategoryFormData] = useState({ cus_cat_title: '' });
  const [customerTypeFormData, setCustomerTypeFormData] = useState({ cus_type_title: '' });
  const [cityFormData, setCityFormData] = useState({ city_name: '' });
  const [isAddingCustomerCategory, setIsAddingCustomerCategory] = useState(false);
  const [isAddingCustomerType, setIsAddingCustomerType] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    cus_name: '',
    cus_phone_no: '',
    cus_phone_no2: '',
    cus_reference: '',
    cus_account_info: '',
    cus_address: '',
    other: '',
    cus_category: '',
    cus_type: '',
    cus_balance: 0,
    CNIC: '',
    NTN_NO: '',
    name_urdu: '',
    city_id: ''
  });

  // Additional filter states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Helper functions
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCustomer('');
    setFilterBillType('ORDER'); // Keep ORDER as default for Orders page
    setFilterStore('');
    setFilterPaymentType('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterBalanceStatus('');
    setDateFrom('');
    setDateTo('');
    setSelectedCustomer(null);
  };

  // Auto-select first store when stores load
  useEffect(() => {
    if (!formSelectedStore && Array.isArray(stores) && stores.length > 0) {
      setFormSelectedStore(stores[0]);
    }
  }, [stores]);

  // Auto-filter bank accounts when customers, categories, or types change
  useEffect(() => {
    if (customers.length > 0 && customerCategories.length > 0 && customerTypes.length > 0) {
      console.log('🔍 Auto-filtering bank accounts for orders...');
      fetchBankAccounts(customers);
    }
  }, [customers, customerCategories, customerTypes]);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle product selection
  const handleProductSelect = (selectedProduct) => {
    console.log('🔍 Product selected:', selectedProduct);
    setFormSelectedProduct(selectedProduct);

    if (selectedProduct) {
      // Update product form data with selected product details
      setProductFormData(prev => ({
        ...prev,
        quantity: '', // Set quantity to empty
        rate: parseFloat(selectedProduct.pro_baser_price) || '', // Use base price as rate
        stock: 0, // always derive from store-wise stock when available
        amount: 0 // Calculate amount (rate * quantity)
      }));

      // If a store is selected, fetch store-wise stock
      if (formSelectedStore?.storeid) {
        fetchStoreStock(formSelectedStore.storeid, selectedProduct.pro_id);
      }
    } else {
      // Reset form data when no product is selected
      setProductFormData({
        quantity: '',
        rate: '',
        amount: 0,
        stock: 0
      });
    }
  };

  // Fetch store-wise stock for a product
  const fetchStoreStock = async (storeId, productId) => {
    try {
      const res = await fetch(`/api/store-stock?store_id=${storeId}&pro_id=${productId}`);
      if (!res.ok) throw new Error('Failed to fetch store stock');
      const data = await res.json();
      console.log('📦 Store stock raw response:', data);

      // Normalize various possible response shapes
      let payload = data;
      if (payload && typeof payload === 'object') {
        payload = payload.data ?? payload.value ?? payload.stock ?? payload;
      }

      let stockQty = 0;
      if (typeof payload === 'number') {
        stockQty = payload;
      } else if (Array.isArray(payload)) {
        const first = payload[0] ?? {};
        stockQty = parseInt(first.stock_quantity ?? first.quantity ?? first.stock ?? 0);
      } else if (payload && typeof payload === 'object') {
        stockQty = parseInt(payload.stock_quantity ?? payload.quantity ?? payload.stock ?? 0);
      }

      // Subtract quantities already added in current table for the same product & store
      const reservedQty = productTableData
        .filter(r => r.pro_id === productId && r.storeid === storeId)
        .reduce((sum, r) => sum + (parseFloat(r.qnty ?? r.quantity ?? 0) || 0), 0);

      // Allow negative stock - removed Math.max constraint
      const available = (isNaN(stockQty) ? 0 : stockQty) - reservedQty;
      console.log('📦 Store stock normalized:', { stockQty, reservedQty, available });

      setProductFormData(prev => ({ ...prev, stock: available }));
    } catch (e) {
      console.error('Failed to load store stock', e);
      setProductFormData(prev => ({ ...prev, stock: 0 }));
    }
  };

  // When store or product changes, refresh store-wise stock
  useEffect(() => {
    if (formSelectedStore?.storeid && formSelectedProduct?.pro_id) {
      fetchStoreStock(formSelectedStore.storeid, formSelectedProduct.pro_id);
    }
  }, [formSelectedStore, formSelectedProduct]);

  // Handle quantity change
  const handleQuantityChange = (newQuantity) => {
    const quantity = parseFloat(newQuantity) || 0;
    const rate = productFormData.rate;
    const amount = quantity * rate;

    setProductFormData(prev => ({
      ...prev,
      quantity: quantity,
      amount: amount
    }));
  };

  // Handle rate change
  const handleRateChange = (newRate) => {
    const rate = parseFloat(newRate) || 0;
    const quantity = productFormData.quantity;
    const amount = quantity * rate;

    setProductFormData(prev => ({
      ...prev,
      rate: rate,
      amount: amount
    }));
  };

  // Handle adding product to table
  const handleAddProductToTable = () => {
    // Validate required fields
    if (!formSelectedProduct) {
      showSnackbar('Please select a product', 'error');
      return;
    }
    if (!formSelectedStore) {
      showSnackbar('Please select a store', 'error');
      return;
    }
    if (productFormData.quantity <= 0) {
      showSnackbar('Please enter a valid quantity', 'error');
      return;
    }
    if (productFormData.rate <= 0) {
      showSnackbar('Please enter a valid rate', 'error');
      return;
    }

    // Check if product already exists in table
    const existingProductIndex = productTableData.findIndex(
      item => item.pro_id === formSelectedProduct.pro_id && item.storeid === formSelectedStore.storeid
    );

    if (existingProductIndex >= 0) {
      // Update existing product quantity and amount
      const updatedData = [...productTableData];
      updatedData[existingProductIndex].quantity += productFormData.quantity;
      updatedData[existingProductIndex].amount = updatedData[existingProductIndex].quantity * updatedData[existingProductIndex].rate;
      setProductTableData(updatedData);
      showSnackbar('Product quantity updated', 'success');
    } else {
      // Add new product to table
      const newProduct = {
        id: Date.now(), // Temporary ID for table row
        pro_id: formSelectedProduct.pro_id,
        pro_title: formSelectedProduct.pro_title,
        storeid: formSelectedStore.storeid,
        store_name: formSelectedStore.store_name,
        quantity: productFormData.quantity,
        rate: productFormData.rate,
        amount: productFormData.amount,
        stock: productFormData.stock
      };

      setProductTableData(prev => [...prev, newProduct]);
      showSnackbar('Product added to table', 'success');
    }

    // Reset form
    setFormSelectedProduct(null);
    // Don't reset store - it should remain selected
    setProductFormData({
      quantity: '',
      rate: '',
      amount: 0,
      stock: 0
    });
  };

  // Handle removing product from table
  const handleRemoveProductFromTable = (productId) => {
    setProductTableData(prev => prev.filter(item => item.id !== productId));
    showSnackbar('Product removed from table', 'success');
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    return productTableData.reduce((total, product) => total + product.amount, 0);
  };

  // Calculate subtotal (products + transport)
  const calculateSubtotal = () => {
    const productTotal = calculateTotalAmount();
    const transportTotal = calculateTransportTotal();
    const subtotal = productTotal + transportTotal;
    return subtotal;
  };

  // Calculate grand total (products + labour + delivery (including transport) - discount)
  const calculateGrandTotal = () => {
    const productTotal = calculateTotalAmount();
    const labour = parseFloat(paymentData.labour) || 0;
    const deliveryCharges = parseFloat(paymentData.deliveryCharges) || 0;
    const transportTotal = calculateTransportTotal();
    const totalDelivery = deliveryCharges + transportTotal; // Transport added to delivery
    const discount = parseFloat(paymentData.discount) || 0;
    return productTotal + labour + totalDelivery - discount;
  };

  // Calculate balance (grand total - total cash received)
  const calculateBalance = () => {
    const grandTotal = calculateGrandTotal();
    const totalCashReceived = parseFloat(paymentData.totalCashReceived) || 0;
    return grandTotal - totalCashReceived;
  };

  // Handle payment data changes
  const handlePaymentDataChange = (field, value) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save bill to database
  const handleSaveBill = async () => {
    try {
      // If bill type is SALE_RETURN, guide user to proper return flow
      if (billType === 'SALE_RETURN') {
        showSnackbar('Use Return Sale from the list to process sale returns.', 'info');
        setCurrentView('list');
        return;
      }

      // Validation
      if (!formSelectedCustomer) {
        showSnackbar('Please select a customer', 'error');
        return;
      }

      if (productTableData.length === 0) {
        showSnackbar('Please add at least one product', 'error');
        return;
      }

      if (!formSelectedStore) {
        showSnackbar('Please select a store', 'error');
        return;
      }

      const totalAmount = calculateTotalAmount();
      const grandTotal = calculateGrandTotal();
      const totalCashReceived = parseFloat(paymentData.totalCashReceived) || 0;

      // Additional validation
      if (totalAmount <= 0) {
        showSnackbar('Total amount must be greater than 0', 'error');
        return;
      }

      console.log('🔍 Frontend - Calculated values:', { totalAmount, grandTotal, totalCashReceived });

      // Prepare sale data
      const transportTotal = calculateTransportTotal();
      const deliveryCharges = parseFloat(paymentData.deliveryCharges) || 0;
      const totalShippingAmount = transportTotal + deliveryCharges;

      // Build split payments array for cash and bank
      const splitPayments = [];
      const cashAmount = parseFloat(paymentData.cash) || 0;
      const bankAmount = parseFloat(paymentData.bank) || 0;

      // Add cash payment if there's any cash
      if (cashAmount > 0) {
        splitPayments.push({
          amount: cashAmount,
          payment_type: 'CASH',
          debit_account_id: null,
          credit_account_id: null,
          reference: 'Cash payment'
        });
      }

      // Add bank payment if there's any bank payment
      if (bankAmount > 0 && paymentData.bankAccountId) {
        splitPayments.push({
          amount: bankAmount,
          payment_type: 'BANK_TRANSFER',
          debit_account_id: paymentData.bankAccountId,
          credit_account_id: null,
          reference: 'Bank payment'
        });
      }

      // Get bank account name for bank_title
      const selectedBankAccount = paymentData.bankAccountId
        ? bankAccounts.find(acc => acc.cus_id === paymentData.bankAccountId)
        : null;

      const saleData = {
        cus_id: formSelectedCustomer.cus_id,
        store_id: formSelectedStore.storeid, // Added store_id for multi-store functionality
        total_amount: grandTotal, // Use grand total instead of just product total
        discount: parseFloat(paymentData.discount) || 0,
        payment: totalCashReceived,
        payment_type: splitPayments.length > 0 ? splitPayments[0].payment_type : 'CASH', // Use first payment type or default to CASH
        cash_payment: cashAmount, // Store cash payment in sale record
        bank_payment: bankAmount, // Store bank payment in sale record
        bank_title: selectedBankAccount?.cus_name || null, // Store bank account name (optional)
        debit_account_id: paymentData.bankAccountId || null,
        credit_account_id: null,
        loader_id: null,
        shipping_amount: totalShippingAmount, // Include both transport and delivery charges
        bill_type: billType || 'BILL',
        reference: paymentData.notes || null,
        is_loaded_order: paymentData.isLoadedOrder || false, // Flag for converted orders
        sale_details: productTableData.map(product => ({
          pro_id: product.pro_id,
          vehicle_no: null,
          qnty: product.quantity,
          unit: 'PCS', // Default unit
          unit_rate: product.rate,
          total_amount: product.amount,
          discount: 0,
          cus_id: formSelectedCustomer.cus_id
        })),
        transport_details: transportOptions.map(transport => ({
          account_id: transport.accountId,
          amount: transport.amount,
          description: transport.description || 'Transport charges'
        })),
        split_payments: splitPayments, // Keep split_payments for backward compatibility
        updated_by: 1 // Default user ID, should be from auth context
      };

      // Show loading
      setLoading(true);

      console.log('🔍 Frontend - Sale data being sent:', saleData);
      console.log('🔍 Frontend - Sale data JSON:', JSON.stringify(saleData, null, 2));

      // Call API
      const response = await fetch('/api/sales', {
        method: editSaleId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editSaleId ? { ...saleData, id: editSaleId } : saleData),
      });

      if (response.ok) {
        const result = await response.json();
        const successMessage = editSaleId ? 'Order updated/converted successfully!' : 'Bill saved successfully!';
        showSnackbar(successMessage, 'success');

        // Clear edit mode
        setEditSaleId(null);

        // Store bill data for printing
        const billDataForPrint = {
          sale_id: result.sale_id,
          cus_id: formSelectedCustomer.cus_id,
          total_amount: grandTotal,
          discount: parseFloat(paymentData.discount) || 0,
          payment: totalCashReceived,
          payment_type: splitPayments.length > 0 ? splitPayments[0].payment_type : 'CASH',
          cash_payment: cashAmount, // Add cash payment details
          bank_payment: bankAmount, // Add bank payment details
          bank_title: selectedBankAccount?.cus_name || null, // Add bank title
          shipping_amount: totalShippingAmount,
          bill_type: billType || 'BILL',
          reference: paymentData.notes || null,
          created_at: new Date().toISOString(),
          customer: formSelectedCustomer,
          sale_details: productTableData.map((product, index) => ({
            sale_detail_id: index + 1,
            pro_id: product.pro_id,
            qnty: product.quantity,
            unit: 'PCS',
            unit_rate: product.rate,
            total_amount: product.amount,
            product: {
              pro_title: product.pro_title || 'N/A'
            }
          })),
          labour: parseFloat(paymentData.labour) || 0,
          notes: paymentData.notes || ''
        };
        setCurrentBillData(billDataForPrint);

        // Open receipt dialog
        setReceiptDialogOpen(true);

        // Reset form
        setFormSelectedCustomer(null);
        setFormSelectedProduct(null);
        setFormSelectedStore(null);
        setProductTableData([]);
        setPaymentData({
          cash: 0,
          bank: 0,
          bankAccountId: '',
          totalCashReceived: 0,
          discount: 0,
          labour: 0,
          deliveryCharges: 0,
          notes: ''
        });

        // Refresh sales data
        fetchData();
      } else {
        const errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
        console.error('❌ Response Status:', response.status);
        showSnackbar(errorData.error || `Failed to save bill (${response.status})`, 'error');
      }
    } catch (error) {
      console.error('❌ Error saving bill:', error);
      console.error('❌ Error details:', error.message);
      showSnackbar(`Failed to save bill: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    console.log('🔍 Component mounted, calling fetchData...');
    fetchData();
  }, []);

  // Open create view preconfigured for Sale Return when flagged (from /dashboard/sale-returns)
  useEffect(() => {
    try {
      const flag = typeof window !== 'undefined' ? localStorage.getItem('openSaleReturnCreate') : null;
      if (flag === '1') {
        setCurrentView('create');
        setBillType('SALE_RETURN');
        localStorage.removeItem('openSaleReturnCreate');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Auto-calculate total cash received when cash or bank changes
  useEffect(() => {
    const cash = parseFloat(paymentData.cash) || 0;
    const bank = parseFloat(paymentData.bank) || 0;
    const totalCashReceived = cash + bank;

    setPaymentData(prev => ({
      ...prev,
      totalCashReceived: totalCashReceived
    }));
  }, [paymentData.cash, paymentData.bank]);

  // Transport functions
  const fetchTransportAccounts = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const accountsData = await response.json();
        // Filter accounts where type is "Transport"
        const transportAccountsData = accountsData.filter(account =>
          account.customer_type &&
          account.customer_type.cus_type_title &&
          account.customer_type.cus_type_title.toLowerCase().includes('transport')
        );
        setTransportAccounts(transportAccountsData);
      } else {
        console.error('❌ Customer accounts API error:', response.status);
        setTransportAccounts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching customer accounts:', error);
      setTransportAccounts([]);
    }
  };

  // Filter customers by category and type for bank accounts
  const filterBankAccountsByCategory = (customers, customerCategories, customerTypes) => {
    console.log('🔍 Filtering bank accounts for orders:');
    console.log('  - Available customers:', customers.length);
    console.log('  - Available categories:', customerCategories.length);
    console.log('  - Available types:', customerTypes.length);

    // Bank accounts: BOTH category AND type must contain "bank"
    const filteredBankAccounts = customers.filter(customer => {
      const categoryInfo = customerCategories.find(cat => cat.cus_cat_id === customer.cus_category);
      const typeInfo = customerTypes.find(t => t.cus_type_id === customer.cus_type);
      const hasBank = categoryInfo && categoryInfo.cus_cat_title.toLowerCase().includes('bank');
      const hasBank2 = typeInfo && typeInfo.cus_type_title.toLowerCase().includes('bank');
      return hasBank && hasBank2;
    });

    console.log(`✅ Filtered ${filteredBankAccounts.length} bank accounts (BOTH category AND type contain 'bank')`);
    return filteredBankAccounts;
  };

  // Bank accounts functions
  const fetchBankAccounts = async (providedCustomers = null) => {
    try {
      let accountsData = providedCustomers;

      if (!accountsData) {
        const response = await fetch('/api/customers');
        if (response.ok) {
          const customersResponse = await response.json();
          accountsData = customersResponse.value || customersResponse;
        }
      }

      if (Array.isArray(accountsData) && customerCategories.length > 0 && customerTypes.length > 0) {
        // Filter bank accounts using category + type validation
        const bankAccountsData = filterBankAccountsByCategory(accountsData, customerCategories, customerTypes);
        console.log('🏦 Bank accounts found:', bankAccountsData.length);
        setBankAccounts(bankAccountsData);
      } else {
        console.warn('⚠️ Cannot filter bank accounts - missing data');
        setBankAccounts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching bank accounts:', error);
      setBankAccounts([]);
    }
  };

  const handleAddTransport = () => {
    if (newTransport.amount <= 0) {
      showSnackbar('Please enter a valid amount', 'error');
      return;
    }
    if (!newTransport.accountId) {
      showSnackbar('Please select a transport account', 'error');
      return;
    }

    // Find the selected account details
    const selectedAccount = transportAccounts.find(account => account.cus_id === parseInt(newTransport.accountId));

    const transport = {
      id: Date.now(),
      name: selectedAccount ? selectedAccount.cus_name : 'Unknown Account',
      amount: parseFloat(newTransport.amount),
      accountId: newTransport.accountId,
      accountName: selectedAccount ? selectedAccount.cus_name : 'Unknown Account'
    };

    setTransportOptions(prev => [...prev, transport]);
    setNewTransport({ amount: 0, accountId: '' });
    showSnackbar('Transport option added', 'success');
  };

  const handleRemoveTransport = (transportId) => {
    setTransportOptions(prev => prev.filter(transport => transport.id !== transportId));
    showSnackbar('Transport option removed', 'success');
  };

  const calculateTransportTotal = () => {
    const total = transportOptions.reduce((sum, transport) => {
      const amount = parseFloat(transport.amount) || 0;
      return sum + amount;
    }, 0);
    return total;
  };

  // Customer creation functions
  const handleOpenCustomerPopup = () => {
    setCustomerPopupOpen(true);
  };

  const handleCloseCustomerPopup = () => {
    setCustomerPopupOpen(false);
    setNewCustomer({
      cus_name: '',
      cus_phone_no: '',
      cus_phone_no2: '',
      cus_reference: '',
      cus_account_info: '',
      cus_address: '',
      other: '',
      cus_category: '',
      cus_type: '',
      cus_balance: 0,
      CNIC: '',
      NTN_NO: '',
      name_urdu: '',
      city_id: ''
    });
  };

  const handleCreateCustomer = async () => {
    // Validate required fields
    if (!newCustomer.cus_name.trim()) {
      showSnackbar('Customer name is required', 'error');
      return;
    }
    if (!newCustomer.cus_phone_no.trim()) {
      showSnackbar('Phone number is required', 'error');
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(newCustomer.cus_phone_no.trim())) {
      showSnackbar('Please enter a valid phone number', 'error');
      return;
    }
    if (!newCustomer.cus_category) {
      showSnackbar('Account category is required', 'error');
      return;
    }
    if (!newCustomer.cus_type) {
      showSnackbar('Customer type is required', 'error');
      return;
    }

    // Check if customer with same phone number already exists
    const existingCustomer = customers.find(customer =>
      customer.cus_phone_no === newCustomer.cus_phone_no.trim()
    );

    if (existingCustomer) {
      showSnackbar(`A customer with phone number ${newCustomer.cus_phone_no} already exists. Please use a different phone number.`, 'error');
      return;
    }

    try {
      const customerData = {
        cus_name: newCustomer.cus_name.trim(),
        cus_phone_no: newCustomer.cus_phone_no.trim(),
        cus_phone_no2: newCustomer.cus_phone_no2.trim(),
        cus_reference: newCustomer.cus_reference.trim(),
        cus_account_info: newCustomer.cus_account_info.trim(),
        cus_address: newCustomer.cus_address.trim(),
        other: newCustomer.other.trim(),
        cus_category: newCustomer.cus_category,
        cus_type: newCustomer.cus_type,
        cus_balance: parseFloat(newCustomer.cus_balance) || 0,
        CNIC: newCustomer.CNIC.trim(),
        NTN_NO: newCustomer.NTN_NO.trim(),
        name_urdu: newCustomer.name_urdu.trim(),
        city_id: newCustomer.city_id || null
      };

      console.log('🔍 Creating customer with data:', customerData);
      console.log('🔍 Available customers:', customers.length);
      console.log('🔍 Available customer categories:', customerCategories.length);
      console.log('🔍 Available customer types:', customerTypes.length);

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        showSnackbar('Customer created successfully', 'success');
        handleCloseCustomerPopup();
        // Refresh customers and transport accounts
        await fetchData();
      } else {
        const errorData = await response.json();
        console.error('❌ Customer creation error:', errorData);
        console.error('❌ Response status:', response.status);
        showSnackbar(errorData.error || errorData.message || 'Error creating customer', 'error');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      showSnackbar('Error creating customer', 'error');
    }
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to fetch data...');

      // Fetch sales data first and separately to ensure it's not affected by other API failures
      try {
        const salesRes = await fetch('/api/sales');
        console.log('📡 Sales API response status:', salesRes.status, salesRes.statusText);

        if (salesRes.ok) {
          const salesData = await salesRes.json();
          console.log('🔍 Sales API response:', salesData);
          console.log('🔍 Sales count:', salesData.length);
          console.log('🔍 Sales data type:', typeof salesData);
          console.log('🔍 Sales is array:', Array.isArray(salesData));

          if (Array.isArray(salesData) && salesData.length > 0) {
            console.log('🔍 First sale structure:', {
              sale_id: salesData[0].sale_id,
              hasCustomer: !!salesData[0].customer,
              customerName: salesData[0].customer?.cus_name,
              total_amount: salesData[0].total_amount,
              keys: Object.keys(salesData[0])
            });
          }

          if (!Array.isArray(salesData)) {
            console.error('❌ Sales data is not an array!', salesData);
            setSales([]);
          } else {
            setSales(salesData);
          }
        } else {
          const errorText = await salesRes.text();
          console.error('❌ Sales API error:', salesRes.status, salesRes.statusText);
          console.error('❌ Error response:', errorText);
          setSales([]);
        }
      } catch (salesError) {
        console.error('❌ Sales fetch error:', salesError);
        console.error('❌ Error stack:', salesError.stack);
        setSales([]);
      }

      // Fetch other data in parallel
      const [customersRes, productsRes, customerTypesRes, storesRes, customerCategoriesRes, citiesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/customer-types'),
        fetch('/api/stores'),
        fetch('/api/customer-category'),
        fetch('/api/cities')
      ]);

      // Fetch transport accounts after main data
      await fetchTransportAccounts();

      // Note: fetchBankAccounts will be called via auto-filter effect once customers, categories, and types are loaded

      console.log('📡 All API calls completed');

      if (customersRes.ok) {
        const customersResponse = await customersRes.json();
        console.log('🔍 Customers API response:', customersResponse);
        console.log('🔍 Customers API response type:', typeof customersResponse);
        console.log('🔍 Customers API response is array:', Array.isArray(customersResponse));
        // Handle the API response format: {value: [...]} or direct array
        const customersData = customersResponse.value || customersResponse;
        console.log('🔍 Customers data after processing:', customersData);
        console.log('🔍 Customers data type:', typeof customersData);
        console.log('🔍 Customers data is array:', Array.isArray(customersData));
        console.log('🔍 Customers count:', customersData.length);
        if (customersData.length > 0) {
          console.log('🔍 First customer:', customersData[0]);
        }
        const customersArray = Array.isArray(customersData) ? customersData : [];
        setCustomers(customersArray);
        console.log('🔍 Customers state set successfully');
      } else {
        console.error('❌ Customers API error:', customersRes.status, customersRes.statusText);
        setCustomers([]);
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        console.log('🔍 Products data:', productsData);
        console.log('🔍 Products count:', productsData.length);
        if (productsData.length > 0) {
          console.log('🔍 First product structure:', productsData[0]);
        }
        setProducts(productsData);
      } else {
        console.error('❌ Products API error:', productsRes.status);
      }
      if (customerTypesRes.ok) {
        const customerTypesResponse = await customerTypesRes.json();
        // Handle the API response format: {value: [...]}
        const customerTypesData = customerTypesResponse.value || customerTypesResponse;
        setCustomerTypes(customerTypesData || []);
      } else {
        console.error('❌ Customer types API error:', customerTypesRes.status);
      }
      if (storesRes.ok) {
        const storesResponse = await storesRes.json();
        console.log('🔍 Stores response:', storesResponse);
        // Handle the API response format: {success: true, data: [...]}
        const storesData = storesResponse.data || storesResponse;
        console.log('🔍 Stores data:', storesData);
        // Ensure storesData is an array
        if (Array.isArray(storesData)) {
          console.log('✅ Setting stores:', storesData);
          setStores(storesData);
        } else {
          console.error('❌ Stores data is not an array:', storesData);
          setStores([]);
        }
      } else {
        console.error('❌ Stores API error:', storesRes.status);
        setStores([]);
      }
      if (customerCategoriesRes.ok) {
        const customerCategoriesData = await customerCategoriesRes.json();
        setCustomerCategories(customerCategoriesData || []);
      } else {
        console.error('❌ Customer categories API error:', customerCategoriesRes.status);
        setCustomerCategories([]);
      }
      if (citiesRes.ok) {
        const citiesData = await citiesRes.json();
        console.log('🔍 Cities data:', citiesData);
        setCities(citiesData || []);
      } else {
        console.error('❌ Cities API error:', citiesRes.status);
        setCities([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle viewing a bill
  const handleViewBill = async (sale) => {
    console.log('📋 Viewing bill:', sale);

    try {
      // Fetch fresh sale data with all payment details
      const response = await fetch(`/api/sales?id=${sale.sale_id}`);
      if (!response.ok) throw new Error('Failed to fetch sale details');
      const saleData = await response.json();

      console.log('💰 Sale data with payments:', {
        cash_payment: saleData.cash_payment,
        bank_payment: saleData.bank_payment,
        bank_title: saleData.bank_title,
        payment: saleData.payment,
        split_payments: saleData.split_payments
      });

      setSelectedBill(saleData);
      setViewBillDialog(true);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      // Fallback to using the data from the list if API call fails
      setSelectedBill(sale);
      setViewBillDialog(true);
    }
  };

  // Handle opening return dialog
  const handleOpenReturnDialog = async (sale) => {
    try {
      // Fetch full sale details with related data
      const response = await fetch(`/api/sales?id=${sale.sale_id}`);
      if (!response.ok) throw new Error('Failed to fetch sale details');
      const saleData = await response.json();
      const fullSale = Array.isArray(saleData) ? saleData[0] : saleData;

      setSelectedSaleForReturn(fullSale);

      // Populate return form with sale data
      setReturnFormData({
        sale_id: fullSale.sale_id,
        cus_id: fullSale.cus_id,
        total_amount: fullSale.total_amount?.toString() || '',
        discount: fullSale.discount?.toString() || '0',
        payment: fullSale.payment?.toString() || '0',
        payment_type: fullSale.payment_type || 'CASH',
        debit_account_id: fullSale.credit_account_id || '',
        credit_account_id: fullSale.debit_account_id || '',
        loader_id: fullSale.loader_id || '',
        shipping_amount: fullSale.shipping_amount?.toString() || '0',
        bill_type: fullSale.bill_type || 'BILL',
        reason: '',
        reference: fullSale.reference || '',
        return_details: fullSale.sale_details ? fullSale.sale_details.map(detail => ({
          pro_id: detail.pro_id,
          qnty: detail.qnty,
          unit: detail.unit,
          unit_rate: detail.unit_rate?.toString() || '0',
          total_amount: detail.total_amount?.toString() || '0',
          discount: detail.discount?.toString() || '0'
        })) : []
      });

      // Set account search terms
      if (fullSale.credit_account) {
        setDebitAccountSearchTerm(fullSale.credit_account.cus_name);
      }
      if (fullSale.debit_account) {
        setCreditAccountSearchTerm(fullSale.debit_account.cus_name);
      }

      setReturnDialogOpen(true);
    } catch (error) {
      console.error('Error opening return dialog:', error);
      showSnackbar('Failed to load sale details', 'error');
    }
  };

  // Handle closing return dialog
  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
    setSelectedSaleForReturn(null);
    setReturnFormData({
      sale_id: '',
      cus_id: '',
      total_amount: '',
      discount: '',
      payment: '',
      payment_type: 'CASH',
      debit_account_id: '',
      credit_account_id: '',
      loader_id: '',
      shipping_amount: '',
      bill_type: 'BILL',
      reason: '',
      reference: '',
      return_details: []
    });
    setDebitAccountSearchTerm('');
    setCreditAccountSearchTerm('');
  };

  // Calculate return totals
  const calculateReturnTotal = () => {
    return returnFormData.return_details.reduce((sum, detail) =>
      sum + parseFloat(detail.total_amount || 0), 0
    );
  };

  const calculateReturnNetTotal = () => {
    const totalAmount = calculateReturnTotal();
    const discount = parseFloat(returnFormData.discount || 0);
    return totalAmount - discount;
  };

  // Handle return form input changes
  const handleReturnInputChange = (e) => {
    const { name, value } = e.target;
    setReturnFormData(prev => ({ ...prev, [name]: value }));
  };

  // Remove return detail
  const removeReturnDetail = (index) => {
    setReturnFormData(prev => ({
      ...prev,
      return_details: prev.return_details.filter((_, i) => i !== index)
    }));
  };

  // Update return detail quantity
  const updateReturnDetailQty = (index, newQty) => {
    setReturnFormData(prev => {
      const updated = [...prev.return_details];
      updated[index] = {
        ...updated[index],
        qnty: parseInt(newQty) || 0,
        total_amount: (parseFloat(updated[index].unit_rate || 0) * parseInt(newQty || 0)).toFixed(2)
      };
      return { ...prev, return_details: updated };
    });
  };

  // Handle return submission
  const handleSubmitReturn = async () => {
    try {
      // Validation
      if (!returnFormData.sale_id) {
        showSnackbar('Please select a sale to return', 'error');
        return;
      }

      if (returnFormData.return_details.length === 0) {
        showSnackbar('Please add at least one product to return', 'error');
        return;
      }

      if (!returnFormData.reason || !returnFormData.reason.trim()) {
        showSnackbar('Please enter a reason for the return', 'error');
        return;
      }

      const calculatedTotalAmount = calculateReturnTotal();

      const body = {
        ...returnFormData,
        total_amount: calculatedTotalAmount.toString(),
        updated_by: 1 // TODO: Get from auth context
      };

      const response = await fetch('/api/sale-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showSnackbar('Sale return processed successfully', 'success');
        handleCloseReturnDialog();
        // Refresh sales list
        const salesResponse = await fetch('/api/sales');
        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          setSales(Array.isArray(salesData) ? salesData : []);
        }
      } else {
        const errorData = await response.json();
        showSnackbar('Error: ' + (errorData.error || 'Failed to process return'), 'error');
      }
    } catch (error) {
      console.error('Error processing sale return:', error);
      showSnackbar('Error processing sale return', 'error');
    }
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

  // Handle closing bill view dialog
  const handleCloseBillDialog = () => {
    setViewBillDialog(false);
    setSelectedBill(null);
  };

  // Current bill data for printing (from create view)
  const [currentBillData, setCurrentBillData] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // Handle print bill with mode (A4 or Thermal)
  const handlePrintBill = (mode = 'A4', fromDialog = false) => {
    try {
      const className = mode === 'THERMAL' ? 'print-thermal' : 'print-a4';
      const isThermal = mode === 'THERMAL';

      // Get the printable container
      const printableContainer = mode === 'THERMAL'
        ? document.getElementById('printable-invoice-thermal')
        : document.getElementById('printable-invoice-a4');

      if (!printableContainer) {
        console.error('Printable container not found');
        return;
      }

      // If printing from dialog, copy receipt preview content
      if (fromDialog) {
        const receiptPreview = document.getElementById('receipt-preview');
        if (receiptPreview && printableContainer) {
          printableContainer.innerHTML = receiptPreview.innerHTML;
        }
      }

      // Move container to visible position temporarily for print
      const originalParent = printableContainer.parentElement;
      const originalStyles = {
        position: printableContainer.style.position,
        left: printableContainer.style.left,
        top: printableContainer.style.top,
        visibility: printableContainer.style.visibility,
        display: printableContainer.style.display
      };

      // Make container visible and position it for print
      printableContainer.style.position = 'fixed';
      printableContainer.style.left = '0';
      printableContainer.style.top = '0';
      printableContainer.style.visibility = 'visible';
      printableContainer.style.display = 'block';
      printableContainer.style.zIndex = '9999';
      printableContainer.style.backgroundColor = 'white';

      // Add dynamic style for thermal page size
      let styleId = 'dynamic-print-style';
      let styleElement = document.getElementById(styleId);

      if (isThermal) {
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = `
          @media print {
            @page {
              size: 80mm auto;
              margin: 5mm;
            }
          }
        `;
      } else if (styleElement) {
        styleElement.textContent = `
          @media print {
            @page {
              size: A4;
              margin: 0.5cm 1cm;
            }
          }
        `;
      }

      // Add body class for print styling
      document.body.classList.add(className);

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          // Restore original styles
          printableContainer.style.position = originalStyles.position;
          printableContainer.style.left = originalStyles.left;
          printableContainer.style.top = originalStyles.top;
          printableContainer.style.visibility = originalStyles.visibility;
          printableContainer.style.display = originalStyles.display;
          printableContainer.style.zIndex = '';
          printableContainer.style.backgroundColor = '';

          // Remove body class
          document.body.classList.remove('print-thermal');
          document.body.classList.remove('print-a4');

          // Remove dynamic style
          if (styleElement && isThermal) {
            styleElement.remove();
          }
        }, 100);
      }, 100);
    } catch (e) {
      console.error('Print error:', e);
      window.print();
    }
  };

  // Filter sales based on search criteria
  const filteredSales = useMemo(() => {
    console.log('🔍 Starting filter with sales count:', sales.length);
    console.log('🔍 Sales is array?', Array.isArray(sales));
    console.log('🔍 Filter criteria:', { searchTerm, filterCustomer, filterBillType, filterStore, filterPaymentType, filterMinAmount, filterMaxAmount, filterBalanceStatus, dateFrom, dateTo });

    // Check if sales array has data
    if (!Array.isArray(sales) || sales.length === 0) {
      console.log('🔍 No sales to filter - returning empty array');
      return [];
    }

    console.log('🔍 Filtering', sales.length, 'sales...');
    const filtered = sales.filter(sale => {
      // All filters are empty by default, so all sales should match
      const matchesSearch = searchTerm === '' ||
        sale.sale_id?.toString().includes(searchTerm) ||
        sale.customer?.cus_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.reference?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCustomer = filterCustomer === '' ||
        sale.customer?.cus_id?.toString() === filterCustomer;

      const matchesBillType = filterBillType === '' ||
        sale.bill_type === filterBillType;

      // Store filter - check if any sale detail has the store
      const matchesStore = filterStore === '' ||
        (sale.sale_details && sale.sale_details.some(detail =>
          detail.store?.storeid?.toString() === filterStore ||
          detail.store_id?.toString() === filterStore
        ));

      // Payment type filter
      const matchesPaymentType = filterPaymentType === '' ||
        sale.payment_type === filterPaymentType;

      // Amount range filters
      const totalAmount = parseFloat(sale.total_amount || 0);
      const matchesMinAmount = filterMinAmount === '' ||
        totalAmount >= parseFloat(filterMinAmount);
      const matchesMaxAmount = filterMaxAmount === '' ||
        totalAmount <= parseFloat(filterMaxAmount);

      // Balance status filter
      const balance = parseFloat(sale.total_amount) - parseFloat(sale.discount || 0) + parseFloat(sale.shipping_amount || 0) - parseFloat(sale.payment || 0);
      const matchesBalanceStatus = filterBalanceStatus === '' ||
        (filterBalanceStatus === 'with_balance' && balance > 0) ||
        (filterBalanceStatus === 'without_balance' && balance <= 0) ||
        (filterBalanceStatus === 'overpaid' && balance < 0);

      const matchesDateFrom = dateFrom === '' ||
        (dateFrom && sale.created_at && new Date(sale.created_at) >= new Date(dateFrom));

      const matchesDateTo = dateTo === '' ||
        (dateTo && sale.created_at && new Date(sale.created_at) <= new Date(dateTo));

      const result = matchesSearch && matchesCustomer && matchesBillType && matchesStore &&
        matchesPaymentType && matchesMinAmount && matchesMaxAmount &&
        matchesBalanceStatus && matchesDateFrom && matchesDateTo;

      if (!result) {
        console.log('🔍 Sale', sale.sale_id, 'filtered out:', {
          matchesSearch,
          matchesCustomer,
          matchesBillType,
          matchesStore,
          matchesPaymentType,
          matchesMinAmount,
          matchesMaxAmount,
          matchesBalanceStatus,
          matchesDateFrom,
          matchesDateTo,
          hasCustomer: !!sale.customer,
          saleData: { sale_id: sale.sale_id, total_amount: sale.total_amount }
        });
      }

      return result;
    });

    const result = filtered
      .sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case 'customer':
            aValue = a.customer?.cus_name || '';
            bValue = b.customer?.cus_name || '';
            break;
          case 'total_amount':
            aValue = parseFloat(a.total_amount || 0);
            bValue = parseFloat(b.total_amount || 0);
            break;
          default:
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
        }

        const modifier = sortOrder === 'asc' ? 1 : -1;

        if (aValue < bValue) return -1 * modifier;
        if (aValue > bValue) return 1 * modifier;
        return 0;
      });

    console.log('🔍 Filtered and sorted sales count:', result.length, 'out of', sales.length);
    if (result.length > 0) {
      console.log('🔍 First filtered sale:', result[0]);
    }
    return result;
  }, [sales, searchTerm, filterCustomer, filterBillType, filterStore, filterPaymentType, filterMinAmount, filterMaxAmount, filterBalanceStatus, dateFrom, dateTo, sortBy, sortOrder]);

  // Calculate stats
  const totalSales = sales.length;
  const totalSalesValue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
  const totalDiscount = sales.reduce((sum, sale) => sum + parseFloat(sale.discount || 0), 0);
  const totalPayment = sales.reduce((sum, sale) => sum + parseFloat(sale.payment || 0), 0);

  // Edit sale state
  const [editSaleId, setEditSaleId] = useState(null);

  const handleEdit = async (sale) => {
    try {
      setLoading(true);
      showSnackbar('Loading order details...', 'info');

      // Fetch full details
      const response = await fetch(`/api/sales?id=${sale.sale_id}`);
      if (!response.ok) throw new Error('Failed to fetch order details');

      const fullSale = await response.json();
      const saleData = Array.isArray(fullSale) ? fullSale[0] : fullSale;

      console.log('📝 Editing sale:', saleData);

      // 1. Set Customer
      setFormSelectedCustomer(saleData.customer);

      // 2. Set Store (find matching store object)
      const storeId = saleData.store_id || (saleData.sale_details?.[0]?.store_id);
      const store = stores.find(s => s.storeid == storeId) || (stores.length > 0 ? stores[0] : null);
      if (store) setFormSelectedStore(store);

      // 3. Populate Product Table
      const tableData = saleData.sale_details.map((d, index) => ({
        id: Date.now() + index, // Unique ID
        pro_id: d.pro_id,
        pro_title: d.product?.pro_title || d.product?.pro_name || 'Unknown Product',
        storeid: store?.storeid,
        store_name: store?.store_name,
        quantity: parseFloat(d.qnty),
        rate: parseFloat(d.unit_rate),
        amount: parseFloat(d.total_amount),
        stock: 0 // Will be updated by store stock fetch
      }));
      setProductTableData(tableData);

      // 4. Populate Payment Data
      setPaymentData({
        cash: parseFloat(saleData.cash_payment || 0),
        bank: parseFloat(saleData.bank_payment || 0),
        bankAccountId: saleData.debit_account_id || '',
        totalCashReceived: parseFloat(saleData.payment || 0), // This is total of cash + bank
        discount: parseFloat(saleData.discount || 0),
        labour: 0,
        deliveryCharges: parseFloat(saleData.shipping_amount || 0),
        notes: saleData.reference || ''
      });

      // 5. Populate Transport Options
      // Map transport details if they exist on the sale object (need backend support or mapping)
      // Current backend might not return transport_details in the main object easily unless included.
      // Assuming GET includes them or we fallback. 
      // Note: GET route includes split_payments but maybe not transport_details in the top level include?
      // GET route line 201 includes `sale_details`. 
      // The `GET` handler in `route.js` does NOT explicitly include `transport_details` in the Prisma include!
      // So transport options might be lost on edit. I will skip transport population for now or accept it's a limitation.
      setTransportOptions([]);

      // 6. Set Conversion Mode
      // User wants to convert Order -> Sale
      setBillType('BILL');
      setEditSaleId(saleData.sale_id);

      // 7. Switch View
      setCurrentView('create');

      showSnackbar('Order loaded for conversion/editing', 'success');

    } catch (e) {
      console.error('Error editing sale:', e);
      showSnackbar('Error loading sale details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saleId) => {
    showSnackbar('Delete functionality will be implemented soon', 'info');
  };

  const handleViewReceipt = async (sale) => {
    try {
      const response = await fetch(`/api/sales?id=${sale.sale_id}`);
      if (!response.ok) throw new Error('Failed to fetch sale details');
      const saleData = await response.json();
      setCurrentBillData(saleData);
      setReceiptDialogOpen(true);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      setCurrentBillData(sale);
      setReceiptDialogOpen(true);
    }
  };

  const handleQuickPrint = async (sale) => {
    try {
      const response = await fetch(`/api/sales?id=${sale.sale_id}`);
      if (!response.ok) throw new Error('Failed to fetch sale details');
      const saleData = await response.json();
      setCurrentBillData(saleData);
      setTimeout(() => handlePrintBill('A4'), 100);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      setCurrentBillData(sale);
      setTimeout(() => handlePrintBill('A4'), 100);
    }
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

  // Render Sales Create View
  const renderSalesCreateView = () => (
    <DashboardLayout>
      <Container
        maxWidth={false}
        sx={{
          py: 1,
          maxWidth: {
            xs: '100%',           // Mobile: full width
            sm: '100%',           // Small screens: full width  
            md: '100%',           // Medium screens: full width
            lg: '1200px',         // Large screens: reasonable max width
            xl: '1400px'          // Extra large screens: slightly larger max width
          },
          mx: 'auto',             // Center the content
          px: { xs: 2, sm: 3, md: 4 } // Responsive horizontal padding
        }}>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => setCurrentView('list')}
                color="primary"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <SearchIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Create New Order
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Select products and create order
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenCustomerPopup}
              sx={{
                borderColor: '#6f42c1',
                color: '#6f42c1',
                '&:hover': {
                  borderColor: '#5a2d91',
                  backgroundColor: '#f8f5ff'
                }
              }}
            >
              Create Customer
            </Button>
          </Box>


          {/* Main Form */}
          <Card>
            <CardContent sx={{ p: 2 }}>
              {/* First Row - Date, Customer, Reference */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                        CUSTOMER
                      </Typography>
                      {formSelectedCustomer && (
                        <Typography variant="body2" sx={{
                          fontWeight: 'bold',
                          color: 'white',
                          fontSize: '0.875rem',
                          bgcolor: 'primary.light',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}>
                          Balance: {formSelectedCustomer.cus_balance ? parseFloat(formSelectedCustomer.cus_balance).toFixed(2) : '0.00'}
                        </Typography>
                      )}
                    </Box>
                    <Autocomplete
                      size="small"
                      options={customers.filter(customer => {
                        // Filter for customers with category "Customer"
                        const isCustomer = customer.customer_category &&
                          customer.customer_category.cus_cat_title &&
                          customer.customer_category.cus_cat_title.toLowerCase().includes('customer');
                        return isCustomer;
                      })}
                      getOptionLabel={(option) => {
                        console.log('🔍 getOptionLabel called with:', option);
                        return option.cus_name || '';
                      }}
                      value={formSelectedCustomer}
                      onChange={(event, newValue) => {
                        console.log('🔍 Customer selected:', newValue);
                        setFormSelectedCustomer(newValue);
                      }}
                      isOptionEqualToValue={(option, value) => option.cus_id === value?.cus_id}
                      renderInput={(params) => {
                        console.log('🔍 renderInput called, customers length:', customers.length);
                        return (
                          <TextField
                            {...params}
                            placeholder="Select customer"
                            sx={{ bgcolor: 'white', minWidth: 250, '& .MuiInputBase-input': { fontWeight: formSelectedCustomer ? 'bold' : 'normal' } }}
                          />
                        );
                      }}
                    />
                    {/* Debug info */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Debug: {customers.length} total customers, {customers.filter(c => c.customer_category?.cus_cat_title?.toLowerCase().includes('customer')).length} customers (filtered)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      BILL TYPE
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={billType}
                        onChange={(e) => setBillType(e.target.value)}
                        sx={{ bgcolor: 'white', minWidth: 200, '& .MuiSelect-select': { fontWeight: 'bold' } }}
                      >
                        <MenuItem value="ORDER">Order</MenuItem>
                        <MenuItem value="BILL">Bill</MenuItem>
                        <MenuItem value="QUOTATION">Quotation</MenuItem>
                        <MenuItem value="SALE_RETURN">Sale Return</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      DATE:
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      size="small"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      REFERENCE
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                </Grid>
              </Grid>


              {/* Product Selection Row */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      SELECT PRODUCT
                    </Typography>
                    <Autocomplete
                      size="small"
                      options={products || []}
                      getOptionLabel={(option) => option.pro_title || ''}
                      value={formSelectedProduct}
                      onChange={(event, newValue) => {
                        console.log('🔍 Product selected:', newValue);
                        handleProductSelect(newValue);
                      }}
                      isOptionEqualToValue={(option, value) => option.pro_id === value?.pro_id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={products.length === 0 ? "No products available" : "Select product"}
                          sx={{ bgcolor: 'white', width: 350, minWidth: 350, '& .MuiInputBase-input': { fontWeight: formSelectedProduct ? 'bold' : 'normal' } }}
                        />
                      )}
                      disabled={products.length === 0}
                    />
                    {/* Debug info */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Debug: {products.length} products available
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      SELECT STORE
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={formSelectedStore?.storeid || ''}
                        onChange={(event) => {
                          const selectedStoreId = event.target.value;
                          const selectedStore = stores.find(store => store.storeid == selectedStoreId);
                          setFormSelectedStore(selectedStore || null);
                        }}
                        sx={{ bgcolor: 'white', '& .MuiSelect-select': { fontWeight: formSelectedStore ? 'bold' : 'normal' } }}
                        displayEmpty
                      >
                        <MenuItem value="">Select Store</MenuItem>
                        {Array.isArray(stores) && stores.length > 0 ? stores.map((store) => (
                          <MenuItem key={store.storeid} value={store.storeid}>
                            {store.store_name}
                          </MenuItem>
                        )) : (
                          <MenuItem disabled>No stores available</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      QTY
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={productFormData.quantity === 0 ? '' : productFormData.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // If rate is already filled, add product directly
                          if (productFormData.rate > 0) {
                            handleAddProductToTable();
                          } else {
                            // Focus on rate field if rate is not filled
                            setTimeout(() => {
                              const rateInputs = document.querySelectorAll('input[type="number"]');
                              // Find the rate input (it's the next number input after quantity)
                              if (rateInputs.length > 1) {
                                rateInputs[1].focus();
                              }
                            }, 0);
                          }
                        }
                      }}
                      sx={{ bgcolor: 'white', width: 160, minWidth: 160 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      RATE:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={productFormData.rate === 0 ? '' : productFormData.rate}
                      onChange={(e) => handleRateChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Add product to table when Enter is pressed in rate field
                          handleAddProductToTable();
                        }
                      }}
                      sx={{ bgcolor: 'white', width: 150, minWidth: 150 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      AMOUNT:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={productFormData.amount}
                      sx={{ bgcolor: 'white', width: 150, minWidth: 150 }}
                      disabled
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      STOCK
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={productFormData.stock}
                      disabled
                      sx={{ bgcolor: '#f8f9fa', width: 150, minWidth: 150 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={1}>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleAddProductToTable}
                      sx={{
                        bgcolor: '#6f42c1',
                        color: 'white',
                        borderRadius: 2,
                        minHeight: 40,
                        '&:hover': { bgcolor: '#5a2d91' }
                      }}
                    >
                      +
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              {/* Product Table */}
              <TableContainer component={Paper} sx={{ mb: 2, border: '1px solid #e9ecef' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>S. No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Store</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productTableData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No products added yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      productTableData.map((product, index) => (
                        <TableRow key={product.id} sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                          <TableCell sx={{ py: 1 }}>{index + 1}</TableCell>
                          <TableCell sx={{ py: 1 }}>{product.store_name}</TableCell>
                          <TableCell sx={{ py: 1 }}>{product.pro_title}</TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={product.quantity}
                              onChange={(e) => {
                                const newQuantity = parseFloat(e.target.value) || 0;
                                if (newQuantity > 0) {
                                  const updatedData = productTableData.map((p) =>
                                    p.id === product.id
                                      ? {
                                        ...p,
                                        quantity: newQuantity,
                                        amount: newQuantity * p.rate
                                      }
                                      : p
                                  );
                                  setProductTableData(updatedData);
                                }
                              }}
                              sx={{
                                width: 80,
                                '& .MuiInputBase-input': {
                                  padding: '4px 8px',
                                  textAlign: 'center'
                                }
                              }}
                              inputProps={{
                                min: 0.01,
                                step: 0.01
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={product.rate}
                              onChange={(e) => {
                                const newRate = parseFloat(e.target.value) || 0;
                                if (newRate >= 0) {
                                  const updatedData = productTableData.map((p) =>
                                    p.id === product.id
                                      ? {
                                        ...p,
                                        rate: newRate,
                                        amount: p.quantity * newRate
                                      }
                                      : p
                                  );
                                  setProductTableData(updatedData);
                                }
                              }}
                              sx={{
                                width: 100,
                                '& .MuiInputBase-input': {
                                  padding: '4px 8px',
                                  textAlign: 'center'
                                }
                              }}
                              inputProps={{
                                min: 0,
                                step: 0.01
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>{product.amount.toFixed(2)}</TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveProductFromTable(product.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {productTableData.length > 0 && (
                      <TableRow sx={{ bgcolor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
                        <TableCell colSpan={5} sx={{ py: 2, fontWeight: 'bold', textAlign: 'right' }}>
                          Total Amount:
                        </TableCell>
                        <TableCell sx={{ py: 2, fontWeight: 'bold', fontSize: '1.1rem' }} key={`table-total-${calculateTotalAmount()}-${transportOptions.length}`}>
                          {Number(calculateTotalAmount()).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ py: 2 }}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Payment Details */}
              <Box sx={{ mt: 2, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Left Section - Payment Fields */}
                <Box sx={{
                  flex: '1 1 48%',
                  minWidth: '300px',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: '#fafafa',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* First Row - CASH, BANK, BANK ACCOUNT, TOTAL CASH RECEIVED */}
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={3}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                          CASH
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={paymentData.cash === 0 ? '' : paymentData.cash}
                          onChange={(e) => handlePaymentDataChange('cash', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' } }}
                          placeholder=" "
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                          BANK
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={paymentData.bank === 0 ? '' : paymentData.bank}
                          onChange={(e) => handlePaymentDataChange('bank', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' } }}
                          placeholder=" "
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                          BANK ACCOUNT
                        </Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={paymentData.bankAccountId}
                            onChange={(e) => handlePaymentDataChange('bankAccountId', e.target.value)}
                            sx={{ bgcolor: 'white', '& .MuiSelect-select': { padding: '8px' } }}
                          >
                            <MenuItem value="">Select Bank</MenuItem>
                            {bankAccounts.map((account) => (
                              <MenuItem key={account.cus_id} value={account.cus_id}>
                                {account.cus_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                          TOTAL CASH RECEIVED
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={paymentData.totalCashReceived}
                          sx={{ bgcolor: '#f5f5f5', '& .MuiInputBase-input': { padding: '8px' } }}
                          disabled
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Second Row - NOTES */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                      NOTES
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      value={paymentData.notes}
                      onChange={(e) => handlePaymentDataChange('notes', e.target.value)}
                      sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' } }}
                      placeholder="Enter any notes..."
                    />
                  </Box>
                </Box>

                {/* Right Section - Input Fields */}
                <Box sx={{
                  flex: '1 1 48%',
                  minWidth: '300px',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: '#fafafa',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* TOTAL AMOUNT */}
                  <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', minWidth: '140px' }}>
                      TOTAL AMOUNT
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={Number(calculateTotalAmount()).toFixed(2)}
                      sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' }, flex: 1 }}
                      disabled
                      inputProps={{
                        readOnly: true
                      }}
                    />
                  </Box>

                  {/* LABOUR */}
                  <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', minWidth: '140px' }}>
                      LABOUR
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={paymentData.labour === 0 ? '' : paymentData.labour}
                      onChange={(e) => handlePaymentDataChange('labour', e.target.value)}
                      sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' }, flex: 1 }}
                      placeholder=" "
                    />
                  </Box>

                  {/* DELIVERY CHARGES (total including transport) */}
                  <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', minWidth: '140px' }}>
                      DELIVERY CHARGES
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={(() => {
                        const totalDelivery = (parseFloat(paymentData.deliveryCharges || 0) + calculateTransportTotal());
                        if (totalDelivery === 0) return '';
                        // Only show decimals if the number has decimal places
                        return totalDelivery % 1 === 0 ? totalDelivery.toString() : totalDelivery.toFixed(2);
                      })()
                      }
                      onChange={(e) => {
                        // Calculate delivery charges by subtracting transport from total
                        const totalValue = parseFloat(e.target.value) || 0;
                        const transportTotal = calculateTransportTotal();
                        const deliveryOnly = totalValue - transportTotal;
                        handlePaymentDataChange('deliveryCharges', deliveryOnly >= 0 ? deliveryOnly : 0);
                      }}
                      sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px', fontWeight: 'bold' }, flex: 1 }}
                      placeholder=" "
                    />
                    {calculateTransportTotal() > 0 && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        (includes Transport: {calculateTransportTotal().toFixed(2)})
                      </Typography>
                    )}
                  </Box>

                  {/* DISCOUNT */}
                  <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', minWidth: '140px' }}>
                      DISCOUNT
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={paymentData.discount === 0 ? '' : paymentData.discount}
                      onChange={(e) => handlePaymentDataChange('discount', e.target.value)}
                      sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' }, flex: 1 }}
                      placeholder=" "
                    />
                  </Box>

                  {/* BALANCE */}
                  <Box sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'primary.light',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: '140px' }}>
                      BALANCE
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={calculateBalance().toFixed(2)}
                      sx={{
                        bgcolor: 'white',
                        '& .MuiInputBase-input': {
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          color: 'primary.main',
                          padding: '8px'
                        },
                        flex: 1
                      }}
                      disabled
                    />
                  </Box>
                </Box>
              </Box>


              {/* Action Buttons */}
              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: '#6c757d',
                    color: '#6c757d',
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#5a6268',
                      color: '#5a6268'
                    }
                  }}
                  onClick={() => {
                    setCurrentBillData(null);
                    setFormSelectedCustomer(null);
                    setFormSelectedProduct(null);
                    setFormSelectedStore(null);
                    setProductTableData([]);
                    setPaymentData({
                      cash: 0,
                      bank: 0,
                      bankAccountId: '',
                      totalCashReceived: 0,
                      discount: 0,
                      labour: 0,
                      deliveryCharges: 0,
                      notes: ''
                    });
                    setTransportOptions([]);
                  }}
                >
                  New
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: '#fd7e14',
                    color: '#fd7e14',
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#e8690b',
                      color: '#e8690b'
                    }
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  sx={{
                    bgcolor: '#fd7e14',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#e8690b' }
                  }}
                  onClick={() => handlePrintBill('A4')}
                  disabled={!currentBillData}
                >
                  Print A4
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  sx={{
                    bgcolor: '#fd7e14',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#e8690b' }
                  }}
                  onClick={() => handlePrintBill('THERMAL')}
                  disabled={!currentBillData}
                >
                  Print Thermal
                </Button>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: '#dc3545',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#c82333' }
                  }}
                  onClick={() => setCurrentView('list')}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: '#28a745',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#218838' }
                  }}
                  onClick={handleSaveBill}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Stack>

        {/* Printable Bill Content - Hidden but accessible for printing */}
        {currentBillData && (
          <Box sx={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '21cm', overflow: 'hidden' }}>
            {/* A4 Printable Container */}
            <Box id="printable-invoice-a4" sx={{ width: '100%', bgcolor: 'white' }}>
              {/* Company Header */}
              <Box sx={{ textAlign: 'center', py: 3, borderBottom: '2px solid #000' }}>
                <Typography variant="h4" sx={{
                  fontWeight: 'bold',
                  mb: 1,
                  fontFamily: 'Arial, sans-serif',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  direction: 'rtl'
                }}>
                  اتفاق آئرن اینڈ سیمنٹ سٹور
                </Typography>
                <Typography variant="body2" sx={{
                  mb: 1,
                  fontSize: { xs: '0.75rem', md: '0.9rem' },
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
                  mt: 2
                }}>
                  ORDER INVOICE
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
                  {currentBillData.customer?.cus_address && (
                    <Typography variant="body2">
                      Address: <strong>{currentBillData.customer.cus_address}</strong>
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Invoice No: <strong>#{currentBillData.sale_id}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Time: <strong>{new Date(currentBillData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Date: <strong>{new Date(currentBillData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Bill Type: <strong>{currentBillData.bill_type || 'BILL'}</strong>
                  </Typography>
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
                      {currentBillData.sale_details && currentBillData.sale_details.length > 0 ? (
                        currentBillData.sale_details.map((detail, index) => (
                          <TableRow key={detail.sale_detail_id || index}>
                            <TableCell sx={{ px: 1 }}>{index + 1}</TableCell>
                            <TableCell sx={{ px: 1 }}>{detail.product?.pro_title || 'N/A'}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{detail.qnty || 0}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.unit_rate || 0).toFixed(2)}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.total_amount || 0).toFixed(2)}</TableCell>
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
                              {parseFloat(currentBillData.labour || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کرایہ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.shipping_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {/* Always show cash payment */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>نقد كيش</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.cash_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {/* Show bank payment with account name if bank payment exists */}
                          {currentBillData.bank_payment > 0 && (
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {currentBillData.bank_title || 'بینک'}
                              </TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {parseFloat(currentBillData.bank_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم وصول</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(currentBillData.payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#d0d0d0' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>بقايا رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {(parseFloat(currentBillData.total_amount || 0) - parseFloat(currentBillData.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Thermal Printable Container */}
            <Box id="printable-invoice-thermal" sx={{ width: '80mm', bgcolor: 'white', mx: 'auto', p: 1 }}>
              <Box sx={{ textAlign: 'center', pb: 1, borderBottom: '1px solid #000' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>اتفاق آئرن اینڈ سیمنٹ سٹور</Typography>
                <Typography sx={{ fontSize: '10px' }}>گجرات سرگودھا روڈ، پاہڑیانوالی</Typography>
                <Typography sx={{ fontSize: '10px' }}>Ph: 0346-7560306, 0300-7560306</Typography>
                <Typography sx={{ mt: 0.5, fontSize: '11px', fontWeight: 'bold' }}>ORDER RECEIPT</Typography>
              </Box>
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontSize: '10px' }}>Inv#: #{currentBillData.sale_id}</Typography>
                <Typography sx={{ fontSize: '10px' }}>Type: {currentBillData.bill_type || 'BILL'}</Typography>
                <Typography sx={{ fontSize: '10px' }}>Date: {new Date(currentBillData.created_at).toLocaleDateString('en-GB')}</Typography>
                <Typography sx={{ fontSize: '10px' }}>Time: {new Date(currentBillData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</Typography>
                <Typography sx={{ fontSize: '10px' }}>Cust: {currentBillData.customer?.cus_name || 'N/A'}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', py: 1 }}>
                {currentBillData.sale_details && currentBillData.sale_details.length > 0 ? (
                  currentBillData.sale_details.map((d, i) => (
                    <Box key={d.sale_detail_id || i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ pr: 1, flex: 1 }}>
                        <Typography sx={{ fontSize: '10px' }}>{d.product?.pro_title || 'Item'}</Typography>
                        <Typography sx={{ fontSize: '9px', color: 'text.secondary' }}>Qty: {d.qnty} x {parseFloat(d.unit_rate || 0).toFixed(2)}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '10px', minWidth: '35mm', textAlign: 'right' }}>{parseFloat(d.total_amount || 0).toFixed(2)}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography sx={{ fontSize: '10px', textAlign: 'center' }}>No items</Typography>
                )}
              </Box>
              <Box sx={{ pt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '10px' }}>Subtotal</Typography>
                  <Typography sx={{ fontSize: '10px' }}>{parseFloat(currentBillData.total_amount || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '10px' }}>Discount</Typography>
                  <Typography sx={{ fontSize: '10px' }}>{parseFloat(currentBillData.discount || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '10px' }}>Shipping</Typography>
                  <Typography sx={{ fontSize: '10px' }}>{parseFloat(currentBillData.shipping_amount || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed #000', mt: 0.5, pt: 0.5 }}>
                  <Typography sx={{ fontSize: '11px' }}>Grand Total</Typography>
                  <Typography sx={{ fontSize: '11px' }}>
                    {parseFloat(currentBillData.total_amount || 0).toFixed(2)}
                  </Typography>
                </Box>
                {/* Cash Payment */}
                {currentBillData.cash_payment > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '10px' }}>Cash Payment</Typography>
                    <Typography sx={{ fontSize: '10px' }}>{parseFloat(currentBillData.cash_payment || 0).toFixed(2)}</Typography>
                  </Box>
                )}
                {/* Bank Payment */}
                {currentBillData.bank_payment > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '10px' }}>Bank Payment ({currentBillData.bank_title || 'Bank'})</Typography>
                    <Typography sx={{ fontSize: '10px' }}>{parseFloat(currentBillData.bank_payment || 0).toFixed(2)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <Typography sx={{ fontSize: '10px' }}>Total Paid</Typography>
                  <Typography sx={{ fontSize: '10px' }}>{parseFloat(currentBillData.payment || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '10px' }}>Balance</Typography>
                  <Typography sx={{ fontSize: '10px' }}>
                    {(parseFloat(currentBillData.total_amount || 0) - parseFloat(currentBillData.payment || 0)).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', mt: 1, pt: 1 }}>
                <Typography sx={{ fontSize: '9px' }}>Thank you for your business!</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Receipt Dialog */}
        <Dialog
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'white',
              borderRadius: 2
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Receipt - Bill #{currentBillData?.sale_id}
            </Typography>
            <IconButton
              onClick={() => setReceiptDialogOpen(false)}
              size="small"
              sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, bgcolor: 'white' }}>
            {currentBillData && (
              <Box id="receipt-preview" sx={{ width: '100%', bgcolor: 'white', p: 3 }}>
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
                    ORDER INVOICE
                  </Typography>
                </Box>

                {/* Customer and Invoice Details */}
                <Box sx={{ px: 2, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: '0 0 50%' }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Customer Name: <strong>{currentBillData.customer?.cus_name || 'N/A'}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Phone No: <strong>{currentBillData.customer?.cus_phone_no || 'N/A'}</strong>
                    </Typography>
                    {currentBillData.customer?.cus_address && (
                      <Typography variant="body2">
                        Address: <strong>{currentBillData.customer.cus_address}</strong>
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Invoice No: <strong>#{currentBillData.sale_id}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Time: <strong>{new Date(currentBillData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Date: <strong>{new Date(currentBillData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Bill Type: <strong>{currentBillData.bill_type || 'BILL'}</strong>
                    </Typography>
                  </Box>
                </Box>

                {/* Product Table */}
                <Box sx={{ px: 2, py: 2 }}>
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
                        {currentBillData.sale_details && currentBillData.sale_details.length > 0 ? (
                          currentBillData.sale_details.map((detail, index) => (
                            <TableRow key={detail.sale_detail_id || index}>
                              <TableCell sx={{ px: 1 }}>{index + 1}</TableCell>
                              <TableCell sx={{ px: 1 }}>{detail.product?.pro_title || 'N/A'}</TableCell>
                              <TableCell sx={{ px: 1 }} align="right">{detail.qnty || 0}</TableCell>
                              <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.unit_rate || 0).toFixed(2)}</TableCell>
                              <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.total_amount || 0).toFixed(2)}</TableCell>
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
                                {parseFloat(currentBillData.labour || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کرایہ</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {parseFloat(currentBillData.shipping_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {parseFloat(currentBillData.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                            {/* Always show cash payment */}
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>نقد كيش</TableCell>
                              <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {parseFloat(currentBillData.cash_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                            {/* Show bank payment with account name if bank payment exists */}
                            {currentBillData.bank_payment > 0 && (
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                  {currentBillData.bank_title || 'بینک'}
                                </TableCell>
                                <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                  {parseFloat(currentBillData.bank_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم وصول</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {parseFloat(currentBillData.payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: '#d0d0d0' }}>
                              <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>بقايا رقم</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                {(parseFloat(currentBillData.total_amount || 0) - parseFloat(currentBillData.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <DialogActions sx={{ p: 3, bgcolor: 'grey.50', borderTop: '1px solid #e0e0e0' }} className="no-print">
            <Button
              onClick={() => setReceiptDialogOpen(false)}
              variant="outlined"
              sx={{ minWidth: 100 }}
            >
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{
                minWidth: 150,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
              onClick={() => handlePrintBill('A4', true)}
            >
              Print A4
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{
                minWidth: 150,
                bgcolor: '#fd7e14',
                '&:hover': { bgcolor: '#e8690b' }
              }}
              onClick={() => handlePrintBill('THERMAL', true)}
            >
              Print Thermal
            </Button>
          </DialogActions>
        </Dialog>

        {/* Print Styles for Create View */}
        <style jsx global>{`
          @media print {
            /* Hide UI chrome when printing */
            .no-print, 
            .MuiDialog-root,
            .MuiDialog-container,
            .MuiDialog-paper,
            .MuiDialogTitle-root,
            .MuiDialogActions-root { 
              display: none !important; 
            }
            header, nav, footer { 
              display: none !important; 
            }
            
            /* Hide everything by default when printing */
            body.print-a4 *,
            body.print-thermal * {
              visibility: hidden !important;
            }
            
            /* Show printable content */
            body.print-a4 #printable-invoice-a4,
            body.print-a4 #printable-invoice-a4 *,
            body.print-thermal #printable-invoice-thermal,
            body.print-thermal #printable-invoice-thermal * {
              visibility: visible !important;
            }
            
            /* Position and style printable containers */
            body.print-a4 #printable-invoice-a4 {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              z-index: 9999 !important;
              background: white !important;
            }
            
            body.print-thermal #printable-invoice-thermal {
              position: fixed !important;
              left: 50% !important;
              top: 0 !important;
              transform: translateX(-50%) !important;
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              z-index: 9999 !important;
              background: white !important;
            }
          }
        `}</style>
      </Container>
    </DashboardLayout>
  );

  const renderSalesListView = () => (
    <DashboardLayout>
      <Container
        maxWidth={false}
        sx={{
          py: 4,
          maxWidth: {
            xs: '100%',           // Mobile: full width
            sm: '100%',           // Small screens: full width  
            md: '100%',           // Medium screens: full width
            lg: '1200px',         // Large screens: reasonable max width
            xl: '1400px'          // Extra large screens: slightly larger max width
          },
          mx: 'auto',             // Center the content
          px: { xs: 2, sm: 3, md: 4 } // Responsive horizontal padding
        }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Order Management
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage your orders, customers, and revenue with professional tracking
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PackageIcon />}
                onClick={() => showSnackbar('Hold Bill functionality will be implemented soon', 'info')}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B35 30%, #F7931E 90%)',
                  boxShadow: '0 3px 5px 2px rgba(255, 107, 53, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #E55A2B 30%, #E8851B 90%)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: 2,
                  px: 3
                }}
              >
                Hold Bill
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setBillType('ORDER');
                  setCurrentView('create');
                }}
                sx={{
                  background: 'linear-gradient(45deg, #4CAF50 30%, #2E7D32 90%)',
                  boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #388E3C 30%, #1B5E20 90%)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: 2,
                  px: 3
                }}
              >
                Add New Order
              </Button>
            </Box>
          </Box>

          {/* Stats Cards Section */}
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
                  { title: 'Total Orders', val: totalSales, color: '#2563eb', bg: '#eff6ff', icon: <ShoppingCartIcon /> },
                  { title: 'Total Revenue', val: totalSalesValue, color: '#16a34a', bg: '#f0fdf4', icon: <TrendingUpIcon /> },
                  { title: 'Total Discount', val: totalDiscount, color: '#dc2626', bg: '#fef2f2', icon: <TrendingDownIcon /> },
                  { title: 'Total Payment', val: totalPayment, color: '#d97706', bg: '#fffbeb', icon: <MoneyIcon /> }
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
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterListIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Filters & Sorting</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing <strong>{filteredSales.length}</strong> of {sales.length} orders
                  </Typography>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                    sx={{ fontWeight: 600 }}
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
                    label="Search Orders"
                    placeholder="ID, Customer, or Reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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

                {/* Customer Filter */}
                <Box>
                  <Autocomplete
                    fullWidth
                    options={customers.filter(customer =>
                      customer.customer_category?.cus_cat_title?.toLowerCase().includes('customer')
                    )}
                    getOptionLabel={(option) => option.cus_name || ''}
                    value={customers.find(c => c.cus_id.toString() === filterCustomer) || null}
                    onChange={(event, newValue) => setFilterCustomer(newValue ? newValue.cus_id.toString() : '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        placeholder="All Customers"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                      />
                    )}
                  />
                </Box>

                {/* Bill Type */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Bill Type</InputLabel>
                    <Select
                      value={filterBillType}
                      onChange={(e) => setFilterBillType(e.target.value)}
                      label="Bill Type"
                      sx={{ borderRadius: 1.5, bgcolor: 'white' }}
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="ORDER">Order</MenuItem>
                      <MenuItem value="BILL">Bill</MenuItem>
                      <MenuItem value="QUOTATION">Quotation</MenuItem>
                      <MenuItem value="SALE_RETURN">Sale Return</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Store Filter */}
                <Box>
                  <Autocomplete
                    fullWidth
                    options={stores}
                    getOptionLabel={(option) => option.store_name || ''}
                    value={stores.find(s => s.storeid.toString() === filterStore) || null}
                    onChange={(event, newValue) => setFilterStore(newValue ? newValue.storeid.toString() : '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Store"
                        placeholder="All Stores"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                      />
                    )}
                  />
                </Box>

                {/* Payment Type */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Payment Type</InputLabel>
                    <Select
                      value={filterPaymentType}
                      onChange={(e) => setFilterPaymentType(e.target.value)}
                      label="Payment Type"
                      sx={{ borderRadius: 1.5, bgcolor: 'white' }}
                    >
                      <MenuItem value="">All Payments</MenuItem>
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="BANK">Bank</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Status */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterBalanceStatus}
                      onChange={(e) => setFilterBalanceStatus(e.target.value)}
                      label="Status"
                      sx={{ borderRadius: 1.5, bgcolor: 'white' }}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="with_balance">Pending (Balance)</MenuItem>
                      <MenuItem value="without_balance">Paid</MenuItem>
                      <MenuItem value="overpaid">Overpaid</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Date Range */}
                <Box sx={{ gridColumn: { md: 'span 2' } }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="From"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="To"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>
                </Box>

                {/* Amount Range */}
                <Box sx={{ gridColumn: { md: 'span 2' } }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Min Amount"
                      placeholder="PKR"
                      value={filterMinAmount}
                      onChange={(e) => setFilterMinAmount(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Amount"
                      placeholder="PKR"
                      value={filterMaxAmount}
                      onChange={(e) => setFilterMaxAmount(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'white' } }}
                    />
                  </Box>
                </Box>

                {/* Sort Combinations (To match Premium style) */}
                <Box sx={{ gridColumn: { md: 'span 2' } }}>
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
                          <FilterListIcon size={18} sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      }
                      sx={{ borderRadius: 1.5, bgcolor: 'white' }}
                    >
                      <MenuItem value="created_at-desc">Newest First</MenuItem>
                      <MenuItem value="created_at-asc">Oldest First</MenuItem>
                      <MenuItem value="customer-asc">Customer (A-Z)</MenuItem>
                      <MenuItem value="customer-desc">Customer (Z-A)</MenuItem>
                      <MenuItem value="total_amount-desc">Amount (High-Low)</MenuItem>
                      <MenuItem value="total_amount-asc">Amount (Low-High)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
                Order List
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredSales.length} of {sales.length} orders
                {sales.length > 0 && ` (Debug: Orders loaded successfully)`}
              </Typography>
            </Box>
            <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Total Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Discount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Shipping</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Payment</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Bill Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                          <ShoppingCartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            {sales.length === 0 ? 'No sales found' : 'No sales match your filters'}
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            {sales.length === 0 ? 'Create your first sale to get started.' : 'Try adjusting your filter criteria.'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => {
                      const balance = parseFloat(sale.total_amount) - parseFloat(sale.discount || 0) + parseFloat(sale.shipping_amount || 0) - parseFloat(sale.payment || 0);
                      return (
                        <TableRow key={sale.sale_id} sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                          <TableCell sx={{ fontWeight: 'medium' }}>{sale.sale_id}</TableCell>
                          <TableCell>{sale.customer?.cus_name || 'N/A'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{parseFloat(sale.total_amount).toFixed(2)}</TableCell>
                          <TableCell>{parseFloat(sale.discount || 0).toFixed(2)}</TableCell>
                          <TableCell>{parseFloat(sale.shipping_amount || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{ fontWeight: 'medium' }}>{parseFloat(sale.payment || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{
                            fontWeight: 'bold',
                            color: balance > 0 ? 'error.main' : balance < 0 ? 'success.main' : 'text.secondary'
                          }}>
                            {balance.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sale.bill_type || 'N/A'}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleViewBill(sale)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Receipt">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewReceipt(sale)}
                                >
                                  <ReceiptIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Print Bill">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleQuickPrint(sale)}
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit / Convert to Sale">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleEdit(sale)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Return Sale">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleOpenReturnDialog(sale)}
                                >
                                  <TrendingDownIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      </Container>
    </DashboardLayout>
  );

  return (
    <>
      {currentView === 'list' ? renderSalesListView() : renderSalesCreateView()}

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

      {/* Customer Creation Popup */}
      <Dialog
        open={customerPopupOpen}
        onClose={handleCloseCustomerPopup}
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
                Add New Customer
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create a new customer profile
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleCloseCustomerPopup}
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
                  startIcon={<MapPinIcon />}
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
                  value={newCustomer.cus_name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_name: e.target.value }))}
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
                  value={newCustomer.cus_phone_no}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_phone_no: e.target.value }))}
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
                  value={newCustomer.cus_phone_no2}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_phone_no2: e.target.value }))}
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

              {/* Address Field */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="cus_address"
                  value={newCustomer.cus_address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_address: e.target.value }))}
                  sx={{ minWidth: 250 }}
                  placeholder="Enter customer address"
                  multiline
                  rows={2}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MapPinIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Second Row - Customer Type, Category */}

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
                  value={(() => {
                    const options = [
                      { id: '', title: 'Select a type' },
                      ...customerTypes.map(type => ({
                        id: type.cus_type_id,
                        title: type.cus_type_title
                      }))
                    ];
                    return options.find(option => option.id === newCustomer.cus_type) || { id: '', title: 'Select a type' };
                  })()}
                  onChange={(event, newValue) => {
                    setNewCustomer(prev => ({
                      ...prev,
                      cus_type: newValue ? newValue.id : ''
                    }));
                  }}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Account Type"
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
                  required
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
                    return options.find(option => option.id === newCustomer.cus_category) || { id: '', title: 'Select a category' };
                  })()}
                  onChange={(event, newValue) => {
                    setNewCustomer(prev => ({
                      ...prev,
                      cus_category: newValue ? newValue.id : ''
                    }));
                  }}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Account Category"
                      sx={{ minWidth: 250 }}
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
                  value={newCustomer.cus_reference}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_reference: e.target.value }))}
                  sx={{ minWidth: 250 }}
                  placeholder="Enter reference number"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Account Info"
                  name="cus_account_info"
                  value={newCustomer.cus_account_info}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_account_info: e.target.value }))}
                  sx={{ minWidth: 250 }}
                  placeholder="Enter account information"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Autocomplete
                  fullWidth
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
                    return options.find(option => option.id === newCustomer.city_id) || { id: '', title: 'Select a city' };
                  })()}
                  onChange={(event, newValue) => {
                    setNewCustomer(prev => ({
                      ...prev,
                      city_id: newValue ? newValue.id : ''
                    }));
                  }}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="City"
                      sx={{ minWidth: 250 }}
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

              {/* Fourth Row - CNIC, NTN, Balance */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="CNIC"
                  name="CNIC"
                  value={newCustomer.CNIC}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, CNIC: e.target.value }))}
                  sx={{ minWidth: 250 }}
                  placeholder="Enter CNIC number"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="NTN Number"
                  name="NTN_NO"
                  value={newCustomer.NTN_NO}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, NTN_NO: e.target.value }))}
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
                  value={newCustomer.cus_balance}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_balance: e.target.value }))}
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
                  value={newCustomer.other}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, other: e.target.value }))}
                  sx={{ minWidth: 250 }}
                  placeholder="Enter other information"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name in Urdu"
                  name="name_urdu"
                  value={newCustomer.name_urdu}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name_urdu: e.target.value }))}
                  sx={{ minWidth: 250 }}
                  placeholder="Enter name in Urdu"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseCustomerPopup} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleCreateCustomer}
            variant="contained"
            sx={{ bgcolor: '#6f42c1', '&:hover': { bgcolor: '#5a2d91' } }}
          >
            Create Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bill View Dialog */}
      <Dialog
        open={viewBillDialog}
        onClose={handleCloseBillDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            width: '210mm', // A4 width
            maxWidth: '210mm',
            '@media print': {
              width: '210mm',
              maxWidth: '210mm',
              margin: '0 auto'
            }
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white',
          py: 2,
          px: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Bill Details - #{selectedBill?.sale_id}
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseBillDialog}
            size="small"
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: 'white' }}>
          {selectedBill && (
            <Box id="printable-invoice" sx={{ width: '100%', bgcolor: 'white' }}>
              {/* Company Header */}
              <Box sx={{ textAlign: 'center', py: 3, borderBottom: '2px solid #000' }}>
                <Typography variant="h4" sx={{
                  fontWeight: 'bold',
                  mb: 1,
                  fontFamily: 'Arial, sans-serif',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  direction: 'rtl'
                }}>
                  اتفاق آئرن اینڈ سیمنٹ سٹور
                </Typography>
                <Typography variant="body2" sx={{
                  mb: 1,
                  fontSize: { xs: '0.75rem', md: '0.9rem' },
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
                  mt: 2
                }}>
                  SALE INVOICE
                </Typography>
              </Box>

              {/* Customer and Invoice Details */}
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Customer Name:</strong> {selectedBill.customer?.cus_name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Phone No:</strong> {selectedBill.customer?.cus_phone_no || 'N/A'}
                  </Typography>
                  {selectedBill.customer?.cus_address && (
                    <Typography variant="body2">
                      <strong>Address:</strong> {selectedBill.customer.cus_address}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Invoice No:</strong> <strong>#{selectedBill.sale_id}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Time:</strong> <strong>{new Date(selectedBill.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Date:</strong> <strong>{new Date(selectedBill.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Bill Type:</strong> <strong>{selectedBill.bill_type || 'BILL'}</strong>
                  </Typography>
                </Box>
              </Box>

              {/* Product Table and Payment Summary - Full Width */}
              <Box sx={{ px: 3, py: 2 }}>
                {/* Product Details Table - Full Width */}
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
                      {selectedBill.sale_details && selectedBill.sale_details.length > 0 ? (
                        selectedBill.sale_details.map((detail, index) => (
                          <TableRow key={detail.sale_detail_id || index}>
                            <TableCell sx={{ px: 1 }}>{index + 1}</TableCell>
                            <TableCell sx={{ px: 1 }}>{detail.product?.pro_title || detail.product?.pro_name || detail.product?.prod_name || 'N/A'}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{detail.qnty || 0}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.unit_rate || 0).toFixed(2)}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right">{parseFloat(detail.total_amount || 0).toFixed(2)}</TableCell>
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

                {/* Payment Summary - Below Product Details */}
                <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  {/* Left Side - Balance Section */}
                  <Box sx={{ flex: '0 0 48%' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, border: '1px solid #000', width: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>سابقہ بقایا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {parseFloat(selectedBill.customer?.cus_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>موجوده بقايا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {(parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>كل بقايا</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>
                              {(parseFloat(selectedBill.customer?.cus_balance || 0) + parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Notes Section */}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        <strong>Notes:</strong> {selectedBill.notes || ''}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Right Side - Payment Summary */}
                  <Box sx={{ flex: '0 0 48%', display: 'flex', justifyContent: 'flex-end' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000', width: '100%', maxWidth: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>رقم بل</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(selectedBill.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>مزدوری</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(selectedBill.labour || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>کرایہ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(selectedBill.shipping_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(selectedBill.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          {/* Show payment details - use cash_payment and bank_payment fields */}
                          {(() => {
                            console.log('🧾 Receipt - Payment Details:', {
                              has_cash_payment: selectedBill.hasOwnProperty('cash_payment'),
                              has_bank_payment: selectedBill.hasOwnProperty('bank_payment'),
                              has_bank_title: selectedBill.hasOwnProperty('bank_title'),
                              cash_payment: selectedBill.cash_payment,
                              bank_payment: selectedBill.bank_payment,
                              bank_title: selectedBill.bank_title,
                              total_payment: selectedBill.payment,
                              payment_type: selectedBill.payment_type
                            });
                            return null;
                          })()}

                          {/* Determine cash and bank amounts - handle both new and old sales */}
                          {(() => {
                            // For new sales, use cash_payment and bank_payment fields
                            // For old sales, use payment and payment_type fields
                            let cashAmount = 0;
                            let bankAmount = 0;
                            let bankName = '';

                            if (selectedBill.hasOwnProperty('cash_payment') && selectedBill.hasOwnProperty('bank_payment')) {
                              // NEW SALE: Has payment split fields
                              cashAmount = parseFloat(selectedBill.cash_payment || 0);
                              bankAmount = parseFloat(selectedBill.bank_payment || 0);
                              bankName = selectedBill.bank_title || selectedBill.debit_account?.cus_name || 'بینک';
                            } else {
                              // OLD SALE: Use legacy payment field
                              if (selectedBill.payment_type === 'CASH' || !selectedBill.payment_type) {
                                cashAmount = parseFloat(selectedBill.payment || 0);
                                bankAmount = 0;
                              } else {
                                cashAmount = 0;
                                bankAmount = parseFloat(selectedBill.payment || 0);
                                bankName = selectedBill.debit_account?.cus_name || 'بینک';
                              }
                            }

                            return (
                              <>
                                {/* Always show cash payment row */}
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                    نقد كيش
                                  </TableCell>
                                  <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                    {cashAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>

                                {/* Show bank payment row if bank payment exists */}
                                {bankAmount > 0 && (
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                      {bankName}
                                    </TableCell>
                                    <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                                      {bankAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })()}
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>كل رقم وصول</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {parseFloat(selectedBill.payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#d0d0d0' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>بقايا رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>
                              {(parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <DialogActions sx={{ p: 3, bgcolor: 'grey.50', borderTop: '1px solid #e0e0e0' }} className="no-print">
          <Button
            onClick={handleCloseBillDialog}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            sx={{
              minWidth: 150,
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
            onClick={handlePrintBill}
          >
            Print Bill
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Show only the printable invoice */
          #printable-invoice,
          #printable-invoice * {
            visibility: visible !important;
          }
          
          /* Position invoice at top */
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 21cm;
            min-height: 29.7cm;
            max-width: 21cm;
            background: white;
            padding: 0;
            margin: 0;
          }
          
          /* Hide dialog wrapper elements */
          .MuiDialog-root,
          .MuiDialog-container,
          .MuiDialog-paper,
          .MuiDialogTitle-root,
          .no-print,
          .no-print * {
            visibility: hidden !important;
            display: none !important;
          }
          
          /* Show dialog content */
          .MuiDialogContent-root {
            visibility: visible !important;
            display: block !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 21cm !important;
            max-width: 21cm !important;
          }
          
          /* Table styles for print */
          table {
            page-break-inside: auto;
            border-collapse: collapse;
            width: 100%;
            font-size: 12px;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tbody {
            display: table-row-group;
          }
          
          /* Ensure proper spacing */
          .MuiBox-root {
            page-break-inside: avoid;
          }
          
          /* Remove shadows and rounded corners */
          .MuiPaper-root {
            box-shadow: none !important;
          }
          
          /* Typography adjustments for A4 */
          .MuiTypography-root {
            font-size: 12px !important;
          }
          
          .MuiTypography-h4 {
            font-size: 24px !important;
          }
          
          .MuiTypography-h6 {
            font-size: 16px !important;
          }
          
          .MuiTypography-body2 {
            font-size: 12px !important;
          }
          
          /* Grid and spacing */
          .MuiGrid-container {
            margin: 0 !important;
          }
          
          .MuiGrid-item {
            padding: 8px !important;
          }
        }
      `}</style>

      {/* Sale Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={handleCloseReturnDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'error.main',
          color: 'white',
          py: 2,
          px: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDownIcon />
            <Typography variant="h6">Process Sale Return</Typography>
          </Box>
          <IconButton
            onClick={handleCloseReturnDialog}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedSaleForReturn && (
            <Box>
              {/* Sale Information */}
              <Card sx={{ mb: 3, bgcolor: 'info.light', p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Sale Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Sale ID:</strong> #{selectedSaleForReturn.sale_id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Customer:</strong> {selectedSaleForReturn.customer?.cus_name || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Total Amount:</strong> {parseFloat(selectedSaleForReturn.total_amount || 0).toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Date:</strong> {new Date(selectedSaleForReturn.created_at).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Bill Type:</strong> {selectedSaleForReturn.bill_type || 'BILL'}</Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Return Products */}
              <Typography variant="h6" sx={{ mb: 2 }}>Products to Return</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.200' }}>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {returnFormData.return_details.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No products selected</TableCell>
                      </TableRow>
                    ) : (
                      returnFormData.return_details.map((detail, index) => {
                        const product = products.find(p => p.pro_id === detail.pro_id);
                        return (
                          <TableRow key={index}>
                            <TableCell>{product?.pro_title || 'N/A'}</TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                size="small"
                                value={detail.qnty}
                                onChange={(e) => updateReturnDetailQty(index, e.target.value)}
                                sx={{ width: 80 }}
                                inputProps={{ min: 0 }}
                              />
                            </TableCell>
                            <TableCell align="right">{parseFloat(detail.unit_rate || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">{parseFloat(detail.total_amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeReturnDetail(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Return Form */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Bill Type</InputLabel>
                    <Select
                      name="bill_type"
                      value={returnFormData.bill_type}
                      onChange={handleReturnInputChange}
                      label="Bill Type"
                      disabled
                    >
                      <MenuItem value="BILL">Bill</MenuItem>
                      <MenuItem value="QUOTATION">Quotation</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Reference"
                    name="reference"
                    value={returnFormData.reference}
                    onChange={handleReturnInputChange}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Return Reason *"
                    name="reason"
                    value={returnFormData.reason}
                    onChange={handleReturnInputChange}
                    multiline
                    rows={3}
                    required
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    value={calculateReturnTotal().toFixed(2)}
                    disabled
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Discount"
                    name="discount"
                    type="number"
                    value={returnFormData.discount}
                    onChange={handleReturnInputChange}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Net Total"
                    value={calculateReturnNetTotal().toFixed(2)}
                    disabled
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Refund Amount *"
                    name="payment"
                    type="number"
                    value={returnFormData.payment}
                    onChange={handleReturnInputChange}
                    required
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Payment Type</InputLabel>
                    <Select
                      name="payment_type"
                      value={returnFormData.payment_type}
                      onChange={handleReturnInputChange}
                      label="Payment Type"
                    >
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="CHEQUE">Cheque</MenuItem>
                      <MenuItem value="BANK">Bank Transfer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseReturnDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReturn}
            variant="contained"
            color="error"
            disabled={returnFormData.return_details.length === 0 || !returnFormData.reason}
          >
            Process Return
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <Container
          maxWidth={false}
          sx={{
            py: 4,
            maxWidth: {
              xs: '100%',           // Mobile: full width
              sm: '100%',           // Small screens: full width  
              md: '100%',           // Medium screens: full width
              lg: '1200px',         // Large screens: reasonable max width
              xl: '1400px'          // Extra large screens: slightly larger max width
            },
            mx: 'auto',             // Center the content
            px: { xs: 2, sm: 3, md: 4 } // Responsive horizontal padding
          }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}