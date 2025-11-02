'use client';

import { useState, useEffect, useMemo } from 'react';
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
  DialogActions
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
  FilterList as FilterIcon,
  MonetizationOn as MoneyIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  LocationOn as MapPinIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

export default function SalesPage() {
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
  const [filterBillType, setFilterBillType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Bill view state
  const [viewBillDialog, setViewBillDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  
  // Form state for sales creation
  const [formSelectedCustomer, setFormSelectedCustomer] = useState(null);
  const [formSelectedProduct, setFormSelectedProduct] = useState(null);
  const [formSelectedStore, setFormSelectedStore] = useState(null);
  
  // Product form state
  const [productFormData, setProductFormData] = useState({
    quantity: 1,
    rate: 0,
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
    cash: 0,
    bank: 0,
    bankAccountId: '',
    totalCashReceived: 0,
    discount: 0,
    labour: 0,
    deliveryCharges: 0,
    notes: ''
  });

  // Customer creation popup state
  const [customerPopupOpen, setCustomerPopupOpen] = useState(false);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    cus_name: '',
    cus_phone_no: '',
    cus_phone_no2: '',
    cus_reference: '',
    cus_account_info: '',
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

  // Auto-select first store when stores load
  useEffect(() => {
    if (!formSelectedStore && Array.isArray(stores) && stores.length > 0) {
      setFormSelectedStore(stores[0]);
    }
  }, [stores]);

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
        quantity: 1, // Set quantity to 1
        rate: parseFloat(selectedProduct.pro_baser_price) || 0, // Use base price as rate
        stock: 0, // always derive from store-wise stock when available
        amount: parseFloat(selectedProduct.pro_baser_price) || 0 // Calculate amount (rate * quantity)
      }));

      // If a store is selected, fetch store-wise stock
      if (formSelectedStore?.storeid) {
        fetchStoreStock(formSelectedStore.storeid, selectedProduct.pro_id);
      }
    } else {
      // Reset form data when no product is selected
      setProductFormData({
        quantity: 1,
        rate: 0,
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

      const available = Math.max(0, (isNaN(stockQty) ? 0 : stockQty) - reservedQty);
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
      quantity: 1,
      rate: 0,
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

  // Calculate grand total (subtotal + labour + delivery - discount)
  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const labour = parseFloat(paymentData.labour) || 0;
    const deliveryCharges = parseFloat(paymentData.deliveryCharges) || 0;
    const discount = parseFloat(paymentData.discount) || 0;
    return subtotal + labour + deliveryCharges - discount;
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
      
      const saleData = {
        cus_id: formSelectedCustomer.cus_id,
        store_id: formSelectedStore.storeid, // Added store_id for multi-store functionality
        total_amount: grandTotal, // Use grand total instead of just product total
        discount: parseFloat(paymentData.discount) || 0,
        payment: totalCashReceived,
        payment_type: 'CASH', // Default payment type
        debit_account_id: paymentData.bankAccountId || null,
        credit_account_id: null,
        loader_id: null,
        shipping_amount: totalShippingAmount, // Include both transport and delivery charges
        bill_type: 'BILL',
        reference: paymentData.notes || null,
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
        split_payments: [],
        updated_by: 1 // Default user ID, should be from auth context
      };

      // Show loading
      setLoading(true);

      console.log('🔍 Frontend - Sale data being sent:', saleData);
      console.log('🔍 Frontend - Sale data JSON:', JSON.stringify(saleData, null, 2));

      // Call API
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar('Bill saved successfully!', 'success');
        
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

  // Bank accounts functions
  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const accountsData = await response.json();
        // Filter accounts where type is "Bank Account"
        const bankAccountsData = accountsData.filter(account => {
          const isBankAccount = account.customer_type && 
            account.customer_type.cus_type_title && 
            account.customer_type.cus_type_title.toLowerCase().includes('bank account');
          
          if (isBankAccount) {
            console.log('🏦 Found bank account:', account.cus_name, account.customer_type.cus_type_title);
          }
          
          return isBankAccount;
        });
        
        console.log('🏦 Bank accounts found:', bankAccountsData.length);
        setBankAccounts(bankAccountsData);
      } else {
        console.error('❌ Bank accounts API error:', response.status);
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
      showSnackbar('Customer category is required', 'error');
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
      
      // Fetch bank accounts after main data
      await fetchBankAccounts();
      
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
        setCustomers(customersData);
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
  const handleViewBill = (sale) => {
    setSelectedBill(sale);
    setViewBillDialog(true);
  };

  // Handle closing bill view dialog
  const handleCloseBillDialog = () => {
    setViewBillDialog(false);
    setSelectedBill(null);
  };

  // Handle print bill
  const handlePrintBill = () => {
    window.print();
  };

  // Filter sales based on search criteria
  const filteredSales = useMemo(() => {
    console.log('🔍 Starting filter with sales count:', sales.length);
    console.log('🔍 Sales is array?', Array.isArray(sales));
    console.log('🔍 Filter criteria:', { searchTerm, filterCustomer, filterBillType, dateFrom, dateTo });
    
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
    
    const matchesDateFrom = dateFrom === '' || 
        (dateFrom && sale.created_at && new Date(sale.created_at) >= new Date(dateFrom));
    
    const matchesDateTo = dateTo === '' || 
        (dateTo && sale.created_at && new Date(sale.created_at) <= new Date(dateTo));
    
    const result = matchesSearch && matchesCustomer && matchesBillType && matchesDateFrom && matchesDateTo;
      
      if (!result) {
        console.log('🔍 Sale', sale.sale_id, 'filtered out:', {
      matchesSearch,
      matchesCustomer,
      matchesBillType,
      matchesDateFrom,
      matchesDateTo,
          hasCustomer: !!sale.customer,
          saleData: { sale_id: sale.sale_id, total_amount: sale.total_amount }
        });
      }
      
    return result;
  });
    
    console.log('🔍 Filtered sales count:', filtered.length, 'out of', sales.length);
    if (filtered.length > 0) {
      console.log('🔍 First filtered sale:', filtered[0]);
    }
    return filtered;
  }, [sales, searchTerm, filterCustomer, filterBillType, dateFrom, dateTo]);
  
  console.log('🔍 Filtered sales count:', filteredSales.length);
  console.log('🔍 Sales state:', sales);
  console.log('🔍 Sales state length:', sales.length);

  // Debug sales state changes
  useEffect(() => {
    console.log('🔍 Sales state changed:', sales);
    console.log('🔍 Sales length:', sales.length);
    if (sales.length > 0) {
      console.log('🔍 First sale:', sales[0]);
    }
  }, [sales]);

  // Debug stores state changes
  useEffect(() => {
    console.log('🏪 Stores state changed:', stores);
    console.log('🏪 Stores length:', stores.length);
    console.log('🏪 Stores type:', typeof stores);
    console.log('🏪 Is stores array:', Array.isArray(stores));
  }, [stores]);

  // Debug customers state changes for sales list
  useEffect(() => {
    console.log('👥 Sales List - Customers state changed:', customers);
    console.log('👥 Sales List - Customers length:', customers.length);
    if (customers.length > 0) {
      console.log('👥 Sales List - First customer:', customers[0]);
      console.log('👥 Sales List - All customer types:', customers.map(c => ({ 
        name: c.cus_name, 
        type: c.customer_type?.cus_type_title,
        cus_type: c.cus_type 
      })));
    }
  }, [customers]);

  // Debug products state changes for new sale page
  useEffect(() => {
    console.log('📦 New Sale - Products state changed:', products);
    console.log('📦 New Sale - Products length:', products.length);
    if (products.length > 0) {
      console.log('📦 New Sale - First product:', products[0]);
    }
  }, [products]);

  // Debug customers state changes for new sale page
  useEffect(() => {
    console.log('👥 New Sale - Customers state changed:', customers);
    console.log('👥 New Sale - Customers length:', customers.length);
    if (customers.length > 0) {
      console.log('👥 New Sale - First customer:', customers[0]);
      console.log('👥 New Sale - Customer types:', customers.map(c => ({ 
        name: c.cus_name, 
        type: c.customer_type?.cus_type_title 
      })));
    }
  }, [customers]);





  // Calculate stats
  const totalSales = sales.length;
  const totalSalesValue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
  const totalDiscount = sales.reduce((sum, sale) => sum + parseFloat(sale.discount || 0), 0);
  const totalPayment = sales.reduce((sum, sale) => sum + parseFloat(sale.payment || 0), 0);

  // Filter and sort sales
  const filteredAndSortedSales = sales
    .filter(sale => {
      const matchesSearch = sale.customer?.cus_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.sale_id?.toString().includes(searchTerm.toLowerCase());
      const matchesCustomer = !selectedCustomer || sale.cus_id === selectedCustomer.cus_id;
      
      return matchesSearch && matchesCustomer;
    })
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

  const handleEdit = (sale) => {
    showSnackbar('Edit functionality will be implemented soon', 'info');
  };

  const handleDelete = async (saleId) => {
    showSnackbar('Delete functionality will be implemented soon', 'info');
  };

  const handleViewReceipt = (sale) => {
    showSnackbar('Receipt functionality will be implemented soon', 'info');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCustomer(null);
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

  // Render Sales Create View
  const renderSalesCreateView = () => (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
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
                  Create New Sale
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Select products and create sale order
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
            <CardContent sx={{ p: 3 }}>
              {/* First Row - Date, Customer, Reference */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
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
                <Grid item xs={12} md={3}>
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      CUSTOMER
                    </Typography>
                      {formSelectedCustomer && (
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'bold', 
                          color: 'primary.main',
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
                        // Filter for customers with type "Customer"
                        const isCustomer = customer.customer_type && 
                               customer.customer_type.cus_type_title && 
                               customer.customer_type.cus_type_title.toLowerCase().includes('customer');
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
                      Debug: {customers.length} total customers, {customers.filter(c => c.customer_type?.cus_type_title?.toLowerCase().includes('customer')).length} customers (filtered)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3.5}>
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
              <Grid container spacing={2} sx={{ mb: 3 }}>
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
                      value={productFormData.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      sx={{ bgcolor: 'white', width: 100, minWidth: 100 }}
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
                      value={productFormData.rate}
                      onChange={(e) => handleRateChange(e.target.value)}
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
                  <Box sx={{ mt: 3 }}>
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
              <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #e9ecef' }}>
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
                          <TableCell sx={{ py: 1 }}>{product.quantity}</TableCell>
                          <TableCell sx={{ py: 1 }}>{product.rate.toFixed(2)}</TableCell>
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
                        <TableCell sx={{ py: 2, fontWeight: 'bold', fontSize: '1.1rem' }} key={`table-total-${calculateSubtotal()}-${transportOptions.length}`}>
                          {Number(calculateSubtotal()).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ py: 2 }}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Transport Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
                  Transport Options
                </Typography>
                
                {/* Transport Input Fields */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Transport Account</InputLabel>
                      <Select
                        value={newTransport.accountId}
                        onChange={(e) => setNewTransport(prev => ({ ...prev, accountId: e.target.value }))}
                        label="Transport Account"
                        sx={{ minWidth: 300 }}
                      >
                        <MenuItem value="">Select Transport Account</MenuItem>
                        {transportAccounts.map((account) => (
                          <MenuItem key={account.cus_id} value={account.cus_id}>
                            {account.cus_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={newTransport.amount}
                      onChange={(e) => setNewTransport(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleAddTransport}
                        sx={{ 
                          bgcolor: '#6f42c1', 
                          color: 'white',
                          minWidth: 40,
                          '&:hover': { bgcolor: '#5a2d91' }
                        }}
                      >
                        +
                      </Button>
                    </Box>
                  </Grid>
                </Grid>

                {/* Transport Options Display */}
                {transportOptions.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                      Transport Options ({transportOptions.length}):
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {transportOptions.map((transport) => (
                        <Chip
                          key={transport.id}
                          label={`${transport.accountName}: ${transport.amount.toFixed(2)}`}
                          onDelete={() => handleRemoveTransport(transport.id)}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                      Transport Total: {calculateTransportTotal().toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Box>

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
                            value={paymentData.cash}
                            onChange={(e) => handlePaymentDataChange('cash', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' } }}
                            placeholder="0"
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
                            value={paymentData.bank}
                            onChange={(e) => handlePaymentDataChange('bank', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' } }}
                            placeholder="0"
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
                          value={Number(calculateSubtotal()).toFixed(2)}
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
                          value={paymentData.labour}
                          onChange={(e) => handlePaymentDataChange('labour', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' }, flex: 1 }}
                          placeholder="0"
                        />
                      </Box>

                      {/* DELIVERY CHARGES */}
                      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', minWidth: '140px' }}>
                          DELIVERY CHARGES
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={paymentData.deliveryCharges}
                          onChange={(e) => handlePaymentDataChange('deliveryCharges', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' }, flex: 1 }}
                          placeholder="0"
                        />
                      </Box>

                      {/* DISCOUNT */}
                      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary', minWidth: '140px' }}>
                          DISCOUNT
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={paymentData.discount}
                          onChange={(e) => handlePaymentDataChange('discount', e.target.value)}
                          sx={{ bgcolor: 'white', '& .MuiInputBase-input': { padding: '8px' }, flex: 1 }}
                          placeholder="0"
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
                  sx={{ 
                    bgcolor: '#fd7e14',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#e8690b' }
                  }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    bgcolor: '#fd7e14',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#e8690b' }
                  }}
                >
                  Thermal
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
      </Container>
    </DashboardLayout>
  );

  const renderSalesListView = () => (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Sales Management
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage your sales orders, customers, and revenue
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
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Hold Bill
              </Button>
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
                Add New Sale
              </Button>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <ShoppingCartIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Total Sales
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {totalSales}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <AttachMoneyIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Total Revenue
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {totalSalesValue.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <TrendingDownIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Total Discount
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {totalDiscount.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(45deg, #FF9800 30%, #F44336 90%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <CreditCardIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Total Payment
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {totalPayment.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Sales Filter */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'semibold' }}>
                Filter Sales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search"
                    placeholder="Search by Sale ID, Customer, or Reference"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={customers.filter(customer => {
                      // Filter customers where type is "Customer"
                      const isCustomer = customer.customer_type && 
                             customer.customer_type.cus_type_title && 
                             customer.customer_type.cus_type_title.toLowerCase().includes('customer');
                      console.log('🔍 Sales List Customer filtering:', customer.cus_name, 'isCustomer:', isCustomer, 'customer_type:', customer.customer_type);
                      return isCustomer;
                    })}
                    getOptionLabel={(option) => option.cus_name || ''}
                    value={customers.find(c => c.cus_id.toString() === filterCustomer) || null}
                    onChange={(event, newValue) => {
                      console.log('🔍 Sales List Customer selected:', newValue);
                      setFilterCustomer(newValue ? newValue.cus_id.toString() : '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        placeholder="Select customer"
                        sx={{ minWidth: 250 }}
                      />
                    )}
                  />
                  {/* Debug info */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Debug: {customers.length} total customers, {customers.filter(c => c.customer_type?.cus_type_title?.toLowerCase().includes('customer')).length} customers
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Bill Type</InputLabel>
                    <Select
                      value={filterBillType}
                      onChange={(e) => setFilterBillType(e.target.value)}
                      label="Bill Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="BILL">Bill</MenuItem>
                      <MenuItem value="QUOTE">Quote</MenuItem>
                    </Select>
                  </FormControl>
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
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCustomer('');
                    setFilterBillType('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  startIcon={<ClearIcon />}
                >
                  Clear Filters
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 2 }}>
                  Showing {filteredSales.length} of {sales.length} sales
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
                Sales List
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredSales.length} of {sales.length} sales
                {sales.length > 0 && ` (Debug: Sales loaded successfully)`}
              </Typography>
            </Box>
            <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Sale ID</TableCell>
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
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewBill(sale)}
                              title="View Details"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => {
                                // TODO: Implement print functionality
                                console.log('Print sale:', sale.sale_id);
                              }}
                              title="Print Bill"
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
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
            <Grid container spacing={3}>
              {/* First Row - Name, Primary Phone, Secondary Phone */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Customer Name"
                  name="cus_name"
                  value={newCustomer.cus_name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, cus_name: e.target.value }))}
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
                      label="Customer Type"
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
                      label="Customer Category"
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
              <Grid container spacing={2} sx={{ px: 3, py: 2, borderBottom: '1px solid #ddd' }}>
                <Grid item xs={12} md={6}>
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
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Invoice No:</strong> <strong>#{selectedBill.sale_id}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Invoice Date:</strong> <strong>{new Date(selectedBill.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Invoice Time:</strong> <strong>{new Date(selectedBill.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                  </Typography>
                </Grid>
              </Grid>

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
                <Grid container spacing={2}>
                  {/* Left Side - Balance Section */}
                  <Grid item xs={12} md={4}>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none' }}>سابقہ بقایا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none' }}>{parseFloat(selectedBill.customer?.cus_balance || 0).toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none' }}>موجوده بقایا</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none' }}>
                              {(parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.discount || 0) + parseFloat(selectedBill.shipping_amount || 0) - parseFloat(selectedBill.payment || 0)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none' }}>كل بقايا</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: 'none' }}>
                              {(parseFloat(selectedBill.customer?.cus_balance || 0) + parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.discount || 0) + parseFloat(selectedBill.shipping_amount || 0) - parseFloat(selectedBill.payment || 0)).toFixed(2)}
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
                  </Grid>

                  {/* Right Side - Payment Summary */}
                  <Grid item xs={12} md={8}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>رقم بل</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>{parseFloat(selectedBill.total_amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>مزدوری</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>{parseFloat(selectedBill.labour || 0).toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>کرایہ</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>{parseFloat(selectedBill.shipping_amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>كل رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>
                              {(parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.discount || 0) + parseFloat(selectedBill.shipping_amount || 0)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>نقد كيش</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>{parseFloat(selectedBill.payment || 0).toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>بینک : {selectedBill.payment_type === 'BANK' ? 'Bank Transfer' : 'Easy Paisa'}</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>0.00</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>كل رقم وصول</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>
                              {parseFloat(selectedBill.payment || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>بقايا رقم</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: 'none', fontSize: '0.875rem' }}>
                              {(parseFloat(selectedBill.total_amount || 0) - parseFloat(selectedBill.discount || 0) + parseFloat(selectedBill.shipping_amount || 0) - parseFloat(selectedBill.payment || 0)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
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
    </>
  );
}