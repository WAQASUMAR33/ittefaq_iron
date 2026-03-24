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
  Eye,
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

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function FinancePage() {
  // State management
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
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
    cash_amount: '',
    bank_amount: '',
  });

  // Purchase viewer state (opened when clicking the eye / Bill)
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [viewPurchaseDialogOpen, setViewPurchaseDialogOpen] = useState(false);

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

  // Payment Form States
  const [showReceivePaymentForm, setShowReceivePaymentForm] = useState(false);
  const [showPayPaymentForm, setShowPayPaymentForm] = useState(false);
  const [receivePaymentData, setReceivePaymentData] = useState({
    total_payment: '',
    discount: '',
    cash_account: '',
    cash_amount: '',
    bank_account: '',
    bank_amount: '',
    description: ''
  });
  const [payPaymentData, setPayPaymentData] = useState({
    total_payment: '',
    discount: '',
    cash_account: '',
    cash_amount: '',
    bank_account: '',
    bank_amount: '',
    description: ''
  });
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState({ loading: false, error: null });
  const [selectedLedgerBankAccount, setSelectedLedgerBankAccount] = useState(null);
  const [isSubmittingLedger, setIsSubmittingLedger] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setMounted(true);
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

      // Fetch cash and bank accounts
      await fetchCashBankAccounts();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open purchase invoice (used by eye icon / Bill links)
  const handleViewPurchase = async (billNo) => {
    if (!billNo) return;
    try {
      const res = await fetch(`/api/purchases?id=${billNo}`);
      if (!res.ok) {
        console.warn('Purchase not found for bill:', billNo);
        return;
      }
      let purchaseData = await res.json();

      // Compute display_net_total (same fallback logic as purchases page)
      const productTotal = (purchaseData.purchase_details || []).reduce((s, d) => s + parseFloat(d.total_amount || 0), 0) || parseFloat(purchaseData.total_amount || 0);
      const calculatedNetTotal = productTotal +
        parseFloat(purchaseData.unloading_amount || 0) +
        parseFloat(purchaseData.transport_amount || 0) +
        parseFloat(purchaseData.labour_amount || 0) +
        parseFloat(purchaseData.fare_amount || 0) -
        parseFloat(purchaseData.discount || 0);

      // Payment breakdown fallback for older records
      let cashPayment = parseFloat(purchaseData.cash_payment || 0);
      let bankPayment = parseFloat(purchaseData.bank_payment || 0);
      if (cashPayment === 0 && bankPayment === 0 && parseFloat(purchaseData.payment || 0) > 0) {
        const totalPayment = parseFloat(purchaseData.payment || 0);
        if (purchaseData.payment_type === 'CASH') cashPayment = totalPayment;
        else if (purchaseData.payment_type === 'BANK_TRANSFER') bankPayment = totalPayment;
        else cashPayment = totalPayment;
      }

      purchaseData = {
        ...purchaseData,
        display_net_total: calculatedNetTotal,
        cash_payment: cashPayment,
        bank_payment: bankPayment
      };

      setViewingPurchase(purchaseData);
      setViewPurchaseDialogOpen(true);
    } catch (err) {
      console.error('Error fetching purchase for viewer:', err);
    }
  };

  // Filter and sort logic
  const filteredLedgerEntries = ledgerEntries.filter(entry => {
    const matchesSearch = entry.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer?.cus_phone_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer?.cus_phone_no2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer?.cus_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.cus_id?.toString().includes(searchTerm) ||
      entry.customer?.cus_id?.toString().includes(searchTerm);

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

  // Stats calculations - use filtered entries for accuracy when filters are applied
  const statsEntries = (selectedCustomer || searchTerm || selectedCategory || selectedSubCategory)
    ? filteredLedgerEntries
    : ledgerEntries;

  const totalDebit = statsEntries.reduce((sum, entry) => sum + parseFloat(entry.debit_amount || 0), 0);
  const totalCredit = statsEntries.reduce((sum, entry) => sum + parseFloat(entry.credit_amount || 0), 0);
  const totalPayments = statsEntries.reduce((sum, entry) => sum + parseFloat(entry.payments || 0), 0);

  // Get the most accurate current balance: 
  // 1. For a selected customer, use their direct balance from the customer record
  // 2. Otherwise, use the closing balance from the most recent ledger entry (index 0 as it's sorted DESC from API)
  const currentBalance = selectedCustomer
    ? parseFloat(customers.find(c => c.cus_id === selectedCustomer)?.cus_balance || 0)
    : (ledgerEntries.length > 0 ? parseFloat(ledgerEntries[0].closing_balance || 0) : 0);

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
          created_by: 6 // System Administrator
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

  // Utility function for creating discount expenses
  const createDiscountExpense = async (discountAmount, description) => {
    try {
      // First, check if "Discount" expense title exists
      const expenseTitlesResponse = await fetch('/api/expense-titles');
      const expenseTitles = await expenseTitlesResponse.json();

      let discountTitleId = expenseTitles.find(title => title.title.toLowerCase() === 'discount')?.id;

      // If discount title doesn't exist, create it
      if (!discountTitleId) {
        const createTitleResponse = await fetch('/api/expense-titles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Discount' })
        });

        if (createTitleResponse.ok) {
          const newTitle = await createTitleResponse.json();
          discountTitleId = newTitle.id;
        } else {
          console.error('Failed to create discount expense title');
          return;
        }
      }

      // Create the expense entry
      const expenseData = {
        exp_title: `Discount - ${description}`,
        exp_type: discountTitleId,
        exp_detail: `Payment discount of PKR ${discountAmount}`,
        exp_amount: discountAmount,
        updated_by: 7 // Super admin user ID
      };

      const expenseResponse = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (expenseResponse.ok) {
        console.log('Discount expense created successfully');
      } else {
        console.error('Failed to create discount expense');
      }
    } catch (error) {
      console.error('Error creating discount expense:', error);
    }
  };

  // Payment Functions
  const handleReceivePayment = () => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.cus_id === selectedCustomer);
      if (customer) {
        setReceivePaymentData({
          total_payment: '',
          discount: '',
          cash_account: cashAccounts.length > 0 ? cashAccounts[0].cus_id : '',
          cash_amount: '',
          bank_account: '',
          bank_amount: '',
          description: `Payment received from ${customer.cus_name}`
        });
        setShowReceivePaymentForm(true);
      }
    }
  };

  const handlePayPayment = () => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.cus_id === selectedCustomer);
      if (customer) {
        setPayPaymentData({
          total_payment: '',
          discount: '',
          cash_account: cashAccounts.length > 0 ? cashAccounts[0].cus_id : '',
          cash_amount: '',
          bank_account: '',
          bank_amount: '',
          description: `Payment made to ${customer.cus_name}`
        });
        setShowPayPaymentForm(true);
      }
    }
  };

  const fetchCashBankAccounts = async () => {
    try {
      // Fetch customers with their categories and types
      const response = await fetch('/api/customers?include=category,type');
      const allCustomers = await response.json();

      // Filter for cash accounts: category = "Cash Account" (cus_cat_id: 24)
      const cashAccs = allCustomers.filter(c =>
        c.customer_category?.cus_cat_title === 'Cash Account'
      );

      // Filter for bank accounts: category = "Bank Account" (cus_cat_id: 23)
      const bankAccs = allCustomers.filter(c =>
        c.customer_category?.cus_cat_title === 'Bank Account'
      );

      setCashAccounts(cashAccs);
      setBankAccounts(bankAccs);
    } catch (error) {
      console.error('Error fetching cash/bank accounts:', error);
    }
  };

  const handleReceivePaymentSubmit = async () => {
    try {
      setPaymentStatus({ loading: true, error: null });

      const cashAmount = parseFloat(receivePaymentData.cash_amount || 0);
      const bankAmount = parseFloat(receivePaymentData.bank_amount || 0);
      const discountAmount = parseFloat(receivePaymentData.discount || 0);
      const totalAmount = cashAmount + bankAmount + discountAmount;

      if (totalAmount <= 0) {
        alert('Please enter at least one amount (Cash, Bank, or Discount)');
        return;
      }

      const paymentData = {
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: 'RECEIVE',
        account_id: selectedCustomer,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        cash_account_id: receivePaymentData.cash_account || null,
        cash_amount: cashAmount,
        bank_account_id: receivePaymentData.bank_account || null,
        bank_amount: bankAmount,
        description: receivePaymentData.description,
        created_by: 7 // Super admin user ID
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        // Create discount expense if discount > 0
        if (parseFloat(receivePaymentData.discount || 0) > 0) {
          await createDiscountExpense(parseFloat(receivePaymentData.discount), receivePaymentData.description || 'Payment discount');
        }

        setShowReceivePaymentForm(false);
        // Reset form
        setReceivePaymentData({
          total_payment: '',
          discount: '',
          cash_account: '',
          cash_amount: '',
          bank_account: '',
          bank_amount: '',
          description: ''
        });
        // Refresh ledger data
        fetchData();
        alert('Payment received successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to process payment');
    } finally {
      setPaymentStatus({ loading: false, error: null });
    }
  };

  const handlePayPaymentSubmit = async () => {
    try {
      setPaymentStatus({ loading: true, error: null });

      const cashAmount = parseFloat(payPaymentData.cash_amount || 0);
      const bankAmount = parseFloat(payPaymentData.bank_amount || 0);
      const discountAmount = parseFloat(payPaymentData.discount || 0);
      const totalAmount = cashAmount + bankAmount + discountAmount;

      if (totalAmount <= 0) {
        alert('Please enter at least one amount (Cash, Bank, or Discount)');
        return;
      }

      const paymentData = {
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: 'PAY',
        account_id: selectedCustomer,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        cash_account_id: payPaymentData.cash_account || null,
        cash_amount: cashAmount,
        bank_account_id: payPaymentData.bank_account || null,
        bank_amount: bankAmount,
        description: payPaymentData.description,
        created_by: 7 // Super admin user ID
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        // Create discount expense if discount > 0
        if (parseFloat(payPaymentData.discount || 0) > 0) {
          await createDiscountExpense(parseFloat(payPaymentData.discount), payPaymentData.description || 'Payment discount');
        }

        setShowPayPaymentForm(false);
        // Reset form
        setPayPaymentData({
          total_payment: '',
          discount: '',
          cash_account: '',
          cash_amount: '',
          bank_account: '',
          bank_amount: '',
          description: ''
        });
        // Refresh ledger data
        fetchData();
        alert('Payment processed successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to process payment');
    } finally {
      setPaymentStatus({ loading: false, error: null });
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

      setIsSubmittingLedger(true);

      const url = editingLedger ? '/api/ledger' : '/api/ledger';
      const method = editingLedger ? 'PUT' : 'POST';

      const cashAmt = parseFloat(formData.cash_amount || 0);
      const bankAmt = parseFloat(formData.bank_amount || 0);
      const discountAmt = parseFloat(formData.discount_amount || 0);
      const totalPayments = cashAmt + bankAmt + discountAmt;
      let trnx_type = 'CASH';
      if (bankAmt > 0 && cashAmt <= 0) trnx_type = 'BANK_TRANSFER';
      else if (bankAmt > 0 && cashAmt > 0) trnx_type = 'BANK_TRANSFER';

      const discountNote = discountAmt > 0 ? ` | Discount: PKR ${fmtAmt(discountAmt)}` : '';
      const submitData = {
        cus_id: formData.cus_id,
        debit_amount: formData.debit_amount,
        credit_amount: formData.credit_amount,
        bill_no: formData.bill_no,
        trnx_type,
        details: (formData.details || '') + discountNote,
        payments: totalPayments,
        bank_title: selectedLedgerBankAccount?.cus_name || '',
      };

      const body = editingLedger
        ? { id: editingLedger.l_id, ...submitData }
        : { ...submitData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        // Create discount expense if discount amount is entered
        if (discountAmt > 0) {
          const acct = customers.find(c => c.cus_id === formData.cus_id);
          const acctName = acct?.cus_name || `Account #${formData.cus_id}`;
          const billRef = formData.bill_no ? ` | Bill: ${formData.bill_no}` : '';
          const description = `${acctName}${billRef}${formData.details ? ' | ' + formData.details : ''}`;
          await createDiscountExpense(discountAmt, description);
        }

        await fetchData();
        setShowLedgerForm(false);
        setEditingLedger(null);
        setSelectedLedgerBankAccount(null);
        setFormData({
          cus_id: '',
          debit_amount: '',
          credit_amount: '',
          bill_no: '',
          trnx_type: 'CASH',
          details: '',
          cash_amount: '',
          bank_amount: '',
          discount_amount: '',
        });
      }
    } catch (error) {
      console.error('Error saving ledger entry:', error);
    } finally {
      setIsSubmittingLedger(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingLedger(entry);
    const cashAmt = entry.trnx_type === 'BANK_TRANSFER' ? '' : entry.payments?.toString() || '';
    const bankAmt = entry.trnx_type === 'BANK_TRANSFER' ? entry.payments?.toString() || '' : '';
    setFormData({
      cus_id: entry.cus_id,
      debit_amount: entry.debit_amount.toString(),
      credit_amount: entry.credit_amount.toString(),
      bill_no: entry.bill_no || '',
      trnx_type: entry.trnx_type,
      details: entry.details || '',
      cash_amount: cashAmt,
      bank_amount: bankAmt,
      discount_amount: '',
    });
    setSelectedLedgerBankAccount(null);
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

  if (!mounted) {
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
            Initializing...
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
                    placeholder="Search by name, phone, reference, account #, bill #, details..."
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
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#4b5563' }}>
                    {selectedCustomer
                      ? customers.find(c => c.cus_id === selectedCustomer)?.cus_name || 'ITEFAQ BUILDERS'
                      : 'ITEFAQ BUILDERS'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: '#6b7280' }}>
                    Accounting Period: {new Date().getFullYear()}
                  </Typography>

                  {/* Payment Action Buttons */}
                  {selectedCustomer && (
                    <Box sx={{
                      position: 'absolute',
                      right: 24,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      gap: 1
                    }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ArrowDown size={16} />}
                        onClick={handleReceivePayment}
                        sx={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          fontWeight: 600,
                          textTransform: 'none',
                          px: 2,
                          py: 1,
                          borderRadius: 1.5,
                          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.2s'
                        }}
                      >
                        Receive Payment
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ArrowUp size={16} />}
                        onClick={handlePayPayment}
                        sx={{
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: 'white',
                          fontWeight: 600,
                          textTransform: 'none',
                          px: 2,
                          py: 1,
                          borderRadius: 1.5,
                          boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.2s'
                        }}
                      >
                        Pay Payment
                      </Button>
                    </Box>
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

                        {/* New column: Name / Bill (helps quickly find supplier + bill for Cash/Bank rows) */}
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            borderRight: 1,
                            borderColor: '#e5e7eb',
                            bgcolor: '#1f2937',
                            color: 'white',
                            minWidth: 180,
                            letterSpacing: 0.5
                          }}
                        >
                          BILL
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

                        // Determine Bank vs Cash amounts from ledger entry fields
                        let bankAmount = parseFloat(entry.bank_payment || 0);
                        let cashAmount = parseFloat(entry.cash_payment || 0);

                        // Do NOT apply the transaction-type fallback for Labour/Delivery accounts
                        // (prevents the initial labour/delivery DEBIT from showing in Cash/Bank column)
                        const isLabourOrDeliveryAccount = /(labour|delivery|transport)/i.test(entry.customer?.cus_name || '') || /incity \(own\)/i.test(entry.details || '');

                        // For non-payment entries, fall back to transaction type logic (skip for labour/delivery)
                        if (bankAmount === 0 && cashAmount === 0) {
                          if (isSplitPayment) {
                            // Use parsed split amounts
                            bankAmount = splitBankAmount;
                            cashAmount = splitCashAmount;
                          } else if (!isLabourOrDeliveryAccount) {
                            // Preserve existing fallback behavior for non-labour/delivery entries
                            if (entry.trnx_type === 'BANK_TRANSFER' || entry.trnx_type === 'CHEQUE') {
                              bankAmount = entryAmount;
                              cashAmount = 0;
                            } else if (entry.trnx_type === 'CASH') {
                              bankAmount = 0;
                              cashAmount = entryAmount;
                            }
                          }
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
                                {new Date(entry.created_at).toISOString().split('T')[0]}
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ lineHeight: 1.4, fontWeight: 500, color: '#374151', flex: 1 }}>
                                  {entry.details || 'General transaction'}
                                </Typography>

                                {(entry.bill_no && (entry.trnx_type === 'PURCHASE' || (/^\d+$/.test(String(entry.bill_no))))) && (
                                  <Tooltip title="View invoice">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => { e.stopPropagation(); handleViewPurchase(entry.bill_no); }}
                                      sx={{ p: 0.5 }}
                                    >
                                      <Eye size={14} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>

                              {entry.bill_no && (
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 0.5, color: entryTypeColor }}>
                                  Bill: {entry.bill_no}
                                </Typography>
                              )}
                            </TableCell>

                            {/* BILL (show bill number; if this is a purchase debit show the amount too) */}
                            <TableCell
                              sx={{
                                borderRight: 1,
                                borderColor: 'divider',
                                minWidth: 160,
                                bgcolor: rowBgColor
                              }}
                            >
                              {(() => {
                                const firstIndex = finalLedgerEntries.findIndex(e => e.bill_no === entry.bill_no && ((e.cus_id || e.customer?.cus_id) === (entry.cus_id || entry.customer?.cus_id)));
                                const isFirstBill = entry.bill_no && firstIndex === index;

                                // Hide bill for the first ledger row when that row represents a Cash or Bank account
                                const acctName = (entry.customer?.cus_name || '').toLowerCase();
                                const isCashOrBankAccount = acctName.includes('cash') || acctName.includes('bank');

                                if (!entry.bill_no) return (<Typography variant="body2" sx={{ color: '#6b7280' }}>-</Typography>);

                                // If this is the first bill row but belongs to Cash/Bank account, don't show the bill here
                                if (isFirstBill && isCashOrBankAccount) return (<Typography variant="body2" sx={{ color: '#6b7280' }}>-</Typography>);

                                if (!isFirstBill) return '';

                                return (
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    Bill: {entry.bill_no}{' '}
                                    {((entry.trnx_type === 'PURCHASE' && parseFloat(entry.debit_amount || 0) > 0) || (/incity \(own\) - (labour|delivery)/i).test(entry.details || '')) ? (
                                      `— ${parseFloat(entry.debit_amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    ) : ''}
                                  </Typography>
                                );
                              })()}
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

      {/* Add/Edit Ledger Entry Dialog */}
      <Dialog
        open={showLedgerForm}
        onClose={() => {
          setShowLedgerForm(false);
          setEditingLedger(null);
          setSelectedLedgerBankAccount(null);
          setFormData({
            cus_id: '',
            debit_amount: '',
            credit_amount: '',
            bill_no: '',
            trnx_type: 'CASH',
            details: '',
            cash_amount: '',
            bank_amount: '',
            discount_amount: '',
          });
          setCustomerSearchTerm('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)',
            px: 3, py: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Receipt size={22} color="white" />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                  {editingLedger ? 'Edit Ledger Entry' : 'New Ledger Entry'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                  {editingLedger ? `Editing entry #${editingLedger.l_id}` : `Serial #${ledgerEntries.length + 1}`}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => {
                setShowLedgerForm(false);
                setEditingLedger(null);
                setSelectedLedgerBankAccount(null);
                setFormData({
                  cus_id: '',
                  debit_amount: '',
                  credit_amount: '',
                  bill_no: '',
                  trnx_type: 'CASH',
                  details: '',
                  cash_amount: '',
                  bank_amount: '',
                });
                setCustomerSearchTerm('');
              }}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>

            {/* Account */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
                Account *
              </Typography>
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
                onInputChange={(event, newInputValue) => setCustomerSearchTerm(newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search and select account..."
                    required
                    sx={{ bgcolor: 'white', borderRadius: 2 }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} color="#94a3b8" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={key} {...optionProps}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#3b82f6' }}>
                            {option.cus_name?.[0]?.toUpperCase()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{option.cus_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{option.cus_phone_no}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                }}
              />
              {/* Current balance badge */}
              {formData.cus_id && (() => {
                const acct = customers.find(c => c.cus_id === formData.cus_id);
                if (!acct) return null;
                const bal = parseFloat(acct.cus_balance || 0);
                const isPositive = bal >= 0;
                return (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Current Balance:</Typography>
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                      px: 1.5, py: 0.4, borderRadius: 5,
                      bgcolor: isPositive ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${isPositive ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: isPositive ? '#16a34a' : '#dc2626' }}>
                        PKR {Math.abs(bal).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isPositive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {isPositive ? 'DR' : 'CR'}
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}
            </Box>

            {/* Debit / Credit / Bill Number — Row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
                  Debit Amount
                </Typography>
                <TextField
                  fullWidth
                  name="debit_amount"
                  type="number"
                  value={formData.debit_amount}
                  onChange={handleInputChange}
                  inputProps={{ step: 0.01, min: 0 }}
                  placeholder="0.00"
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>PKR</Typography></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
                  Credit Amount
                </Typography>
                <TextField
                  fullWidth
                  name="credit_amount"
                  type="number"
                  value={formData.credit_amount}
                  onChange={handleInputChange}
                  inputProps={{ step: 0.01, min: 0 }}
                  placeholder="0.00"
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>PKR</Typography></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
                  Bill Number
                </Typography>
                <TextField
                  fullWidth
                  name="bill_no"
                  value={formData.bill_no}
                  onChange={handleInputChange}
                  placeholder="Optional"
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Hash size={15} color="#94a3b8" /></InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            {/* Payment Section */}
            <Box sx={{
              border: '1.5px solid #e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 3,
            }}>
              <Box sx={{ bgcolor: '#f1f5f9', px: 2, py: 1.2, borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Payment Breakdown
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'white' }}>
                <Grid container spacing={2}>
                  {/* Cash Payment */}
                  <Grid item xs={12} sm={4}>
                    <Box sx={{
                      border: '1.5px solid #dcfce7',
                      borderRadius: 2, p: 2,
                      bgcolor: '#f0fdf4',
                      height: '100%',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Banknote size={15} color="white" />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d' }}>Cash Payment</Typography>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        name="cash_amount"
                        type="number"
                        value={formData.cash_amount}
                        onChange={handleInputChange}
                        inputProps={{ step: 0.01, min: 0 }}
                        placeholder="0.00"
                        sx={{ bgcolor: 'white', borderRadius: 1.5 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>PKR</Typography></InputAdornment>
                        }}
                      />
                    </Box>
                  </Grid>
                  {/* Bank Payment */}
                  <Grid item xs={12} sm={4}>
                    <Box sx={{
                      border: '1.5px solid #dbeafe',
                      borderRadius: 2, p: 2,
                      bgcolor: '#eff6ff',
                      height: '100%',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={15} color="white" />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1d4ed8' }}>Bank Payment</Typography>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        name="bank_amount"
                        type="number"
                        value={formData.bank_amount}
                        onChange={handleInputChange}
                        inputProps={{ step: 0.01, min: 0 }}
                        placeholder="0.00"
                        sx={{ bgcolor: 'white', borderRadius: 1.5, mb: 1.5 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>PKR</Typography></InputAdornment>
                        }}
                      />
                      <Autocomplete
                        size="small"
                        options={bankAccounts.length > 0 ? bankAccounts : []}
                        getOptionLabel={(option) => option.cus_name || ''}
                        value={selectedLedgerBankAccount}
                        onChange={(event, newValue) => setSelectedLedgerBankAccount(newValue)}
                        disabled={parseFloat(formData.bank_amount || 0) <= 0}
                        filterOptions={(options, { inputValue }) =>
                          options.filter(o => o.cus_name?.toLowerCase().includes(inputValue.toLowerCase()))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={parseFloat(formData.bank_amount || 0) > 0 ? 'Select bank account' : 'Enter amount first'}
                            sx={{
                              bgcolor: parseFloat(formData.bank_amount || 0) > 0 ? 'white' : '#f1f5f9',
                              borderRadius: 1.5,
                              '& .MuiInputBase-input': { fontWeight: selectedLedgerBankAccount ? 700 : 400 },
                            }}
                          />
                        )}
                        renderOption={(props, option) => {
                          const { key, ...optionProps } = props;
                          return (
                            <Box component="li" key={option.cus_id} {...optionProps}>
                              <Box>
                                <Typography variant="body2" fontWeight={700}>{option.cus_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.cus_phone_no}</Typography>
                              </Box>
                            </Box>
                          );
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* Discount */}
                  <Grid item xs={12} sm={4}>
                    <Box sx={{
                      border: '1.5px solid #fde68a',
                      borderRadius: 2, p: 2,
                      bgcolor: '#fffbeb',
                      height: '100%',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DollarSign size={15} color="white" />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#b45309' }}>Discount</Typography>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        name="discount_amount"
                        type="number"
                        value={formData.discount_amount}
                        onChange={handleInputChange}
                        inputProps={{ step: 0.01, min: 0 }}
                        placeholder="0.00"
                        sx={{ bgcolor: 'white', borderRadius: 1.5 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>PKR</Typography></InputAdornment>
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {/* Total summary */}
                {(parseFloat(formData.cash_amount || 0) > 0 || parseFloat(formData.bank_amount || 0) > 0 || parseFloat(formData.discount_amount || 0) > 0) && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e2e8f0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                      {parseFloat(formData.cash_amount || 0) > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>Cash:</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d' }}>PKR {parseFloat(formData.cash_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                      )}
                      {parseFloat(formData.bank_amount || 0) > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 600 }}>Bank:</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1d4ed8' }}>PKR {parseFloat(formData.bank_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                      )}
                      {parseFloat(formData.discount_amount || 0) > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600 }}>Discount:</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309' }}>PKR {parseFloat(formData.discount_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>Total:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#1e40af' }}>
                        PKR {(parseFloat(formData.cash_amount || 0) + parseFloat(formData.bank_amount || 0) + parseFloat(formData.discount_amount || 0)).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Details */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
                Transaction Details
              </Typography>
              <TextField
                fullWidth
                name="details"
                value={formData.details}
                onChange={handleInputChange}
                multiline
                rows={3}
                placeholder="Enter transaction details or notes..."
                sx={{ bgcolor: 'white', borderRadius: 2 }}
              />
            </Box>

          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid #e2e8f0', bgcolor: 'white', gap: 1.5 }}>
          <Button
            onClick={() => {
              setShowLedgerForm(false);
              setEditingLedger(null);
              setSelectedLedgerBankAccount(null);
              setFormData({ cus_id: '', debit_amount: '', credit_amount: '', bill_no: '', trnx_type: 'CASH', details: '', cash_amount: '', bank_amount: '', discount_amount: '' });
              setCustomerSearchTerm('');
            }}
            variant="outlined"
            sx={{ borderColor: '#e2e8f0', color: '#64748b', '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }, px: 3, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmittingLedger}
            sx={{
              background: isSubmittingLedger ? undefined : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' },
              px: 4, fontWeight: 700, borderRadius: 2,
              boxShadow: isSubmittingLedger ? 'none' : '0 4px 14px rgba(59,130,246,0.4)',
              minWidth: 140,
            }}
          >
            {isSubmittingLedger ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
                {editingLedger ? 'Updating...' : 'Creating...'}
              </Box>
            ) : (
              editingLedger ? 'Update Entry' : 'Create Entry'
            )}
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
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{
          bgcolor: '#2563eb',
          color: 'white',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>GENERAL JOURNAL ENTRY</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', px: 1.5, py: 0.5, borderRadius: 1 }}>
              Serial: #{ledgerEntries.length + 1}
            </Typography>
            <IconButton onClick={() => setShowJournalForm(false)} size="small" sx={{ color: 'white' }}>
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          <Box component="form" id="journal-form" onSubmit={handleJournalSubmit} sx={{ mt: 1 }}>

            {/* Top Fields - Single Line Layout */}
            <Grid container spacing={3} sx={{ mb: 4 }} alignItems="center">

              <Grid item xs={4} md={2}>
                <Typography sx={{ fontWeight: 600, color: '#475569' }}>Journal Date:</Typography>
              </Grid>
              <Grid item xs={8} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={journalData.journal_date}
                  onChange={(e) => setJournalData({ ...journalData, journal_date: e.target.value })}
                />
              </Grid>

              <Grid item xs={4} md={2}>
                <Typography sx={{ fontWeight: 600, color: '#475569' }}>Type:</Typography>
              </Grid>
              <Grid item xs={8} md={4}>
                <FormControl fullWidth size="small">
                  <Select
                    value={journalData.journal_type}
                    onChange={(e) => setJournalData({ ...journalData, journal_type: e.target.value })}
                    displayEmpty
                  >
                    <MenuItem value="PAYMENT">Payment</MenuItem>
                    <MenuItem value="RECEIPT">Receipt</MenuItem>
                    <MenuItem value="TRANSFER">Transfer</MenuItem>
                    <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={4} md={2}>
                <Typography sx={{ fontWeight: 600, color: '#475569' }}>Reference / Bill #:</Typography>
              </Grid>
              <Grid item xs={8} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  value={journalData.reference}
                  onChange={(e) => setJournalData({ ...journalData, reference: e.target.value })}
                  placeholder="Optional"
                />
              </Grid>

              <Grid item xs={4} md={2}>
                <Typography sx={{ fontWeight: 600, color: '#475569' }}>Description:</Typography>
              </Grid>
              <Grid item xs={8} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  value={journalData.description}
                  onChange={(e) => setJournalData({ ...journalData, description: e.target.value })}
                  placeholder="Journal description..."
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
                          renderOption={(props, option) => {
                            const { key, ...optionProps } = props;
                            return (
                              <Box component="li" key={key} {...optionProps}>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{option.cus_name}</Typography>
                                  <Typography variant="caption" color="textSecondary">{option.customer_type?.cus_type_title}</Typography>
                                </Box>
                              </Box>
                            );
                          }}
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
              bgcolor: '#2563eb',
              textTransform: 'none',
              fontWeight: 700,
              px: 6,
              py: 1.5,
              borderRadius: 2,
              '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            {journalStatus.loading ? <CircularProgress size={24} color="inherit" /> : 'Post General Journal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive Payment Dialog */}
      <Dialog
        open={showReceivePaymentForm}
        onClose={() => setShowReceivePaymentForm(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{
          bgcolor: '#10b981',
          color: 'white',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>RECEIVE PAYMENT</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', px: 1.5, py: 0.5, borderRadius: 1 }}>
            Serial: #{ledgerEntries.length + 1}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Account Info */}
            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Selected Account
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#14532d' }}>
                    {customers.find(c => c.cus_id === selectedCustomer)?.cus_name || 'Individual Account'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Current Balance
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a' }}>
                    PKR {currentBalance.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Cash Amount Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Cash Amount
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={receivePaymentData.cash_amount}
                onChange={(e) => setReceivePaymentData(prev => ({ ...prev, cash_amount: e.target.value }))}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                }}
              />
            </Box>

            {/* Bank Account Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Bank Account
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={receivePaymentData.bank_account}
                  onChange={(e) => setReceivePaymentData(prev => ({ ...prev, bank_account: e.target.value }))}
                  displayEmpty
                  sx={{ bgcolor: '#f8fafc' }}
                >
                  <MenuItem value="">Select Bank Account</MenuItem>
                  {bankAccounts.map(account => (
                    <MenuItem key={account.cus_id} value={account.cus_id}>{account.cus_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Bank Amount
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={receivePaymentData.bank_amount}
                onChange={(e) => setReceivePaymentData(prev => ({ ...prev, bank_amount: e.target.value }))}
                disabled={!receivePaymentData.bank_account}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                }}
              />
            </Box>

            {/* Discount */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Discount
              </Typography>
              <TextField
                fullWidth
                placeholder="0.00"
                type="number"
                value={receivePaymentData.discount}
                onChange={(e) => setReceivePaymentData(prev => ({ ...prev, discount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                }}
              />
            </Box>

            <Divider sx={{ borderStyle: 'dotted', my: 1 }} />

            {/* Description */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={receivePaymentData.description}
                onChange={(e) => setReceivePaymentData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter payment details..."
                sx={{ bgcolor: '#f8fafc' }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setShowReceivePaymentForm(false)} sx={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handleReceivePaymentSubmit}
            variant="contained"
            disabled={paymentStatus.loading}
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              px: 4,
              fontWeight: 700
            }}
          >
            {paymentStatus.loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Receipt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Payment Dialog */}
      <Dialog
        open={showPayPaymentForm}
        onClose={() => setShowPayPaymentForm(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{
          bgcolor: '#ef4444',
          color: 'white',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>ISSUE PAYMENT</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', px: 1.5, py: 0.5, borderRadius: 1 }}>
            Serial: #{ledgerEntries.length + 1}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Account Info */}
            <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Selected Account
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#7f1d1d' }}>
                    {customers.find(c => c.cus_id === selectedCustomer)?.cus_name || 'Individual Account'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Current Balance
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626' }}>
                    PKR {currentBalance.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Cash Amount Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Cash Amount
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={payPaymentData.cash_amount}
                onChange={(e) => setPayPaymentData(prev => ({ ...prev, cash_amount: e.target.value }))}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                }}
              />
            </Box>

            {/* Bank Account Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Bank Account
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={payPaymentData.bank_account}
                  onChange={(e) => setPayPaymentData(prev => ({ ...prev, bank_account: e.target.value }))}
                  displayEmpty
                  sx={{ bgcolor: '#f8fafc' }}
                >
                  <MenuItem value="">Select Bank Account</MenuItem>
                  {bankAccounts.map(account => (
                    <MenuItem key={account.cus_id} value={account.cus_id}>{account.cus_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Bank Amount
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={payPaymentData.bank_amount}
                onChange={(e) => setPayPaymentData(prev => ({ ...prev, bank_amount: e.target.value }))}
                disabled={!payPaymentData.bank_account}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                }}
              />
            </Box>

            {/* Discount */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Discount
              </Typography>
              <TextField
                fullWidth
                placeholder="0.00"
                type="number"
                value={payPaymentData.discount}
                onChange={(e) => setPayPaymentData(prev => ({ ...prev, discount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                }}
              />
            </Box>

            <Divider sx={{ borderStyle: 'dotted', my: 1 }} />

            {/* Description */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={payPaymentData.description}
                onChange={(e) => setPayPaymentData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter payment details..."
                sx={{ bgcolor: '#f8fafc' }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setShowPayPaymentForm(false)} sx={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handlePayPaymentSubmit}
            variant="contained"
            disabled={paymentStatus.loading}
            sx={{
              bgcolor: '#ef4444',
              '&:hover': { bgcolor: '#dc2626' },
              px: 4,
              fontWeight: 700
            }}
          >
            {paymentStatus.loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purchase invoice viewer (opened by eye icon or Bill links) */}
      <Dialog
        open={viewPurchaseDialogOpen}
        onClose={() => { setViewPurchaseDialogOpen(false); setViewingPurchase(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, boxShadow: 3 } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Receipt />
          Purchase Receipt - #{viewingPurchase?.sequentialId || viewingPurchase?.pur_id}
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '80vh', overflow: 'auto' }}>
          {viewingPurchase && (
            <Box id="purchase-invoice-ledger" sx={{ width: '100%', bgcolor: 'white', p: 3, mt: 2 }}>
              <Box sx={{ textAlign: 'center', py: 2, borderBottom: '2px solid #000' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
                  اتفاق آئرن اینڈ سیمنٹ سٹور
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, direction: 'rtl' }}>
                  گجرات سرگودھا روڈ، پاہڑیانوالی
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, mt: 1 }}>
                  PURCHASE INVOICE
                </Typography>
              </Box>

              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Supplier Name: <strong>{viewingPurchase.customer?.cus_name || 'N/A'}</strong></Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Phone No: <strong>{viewingPurchase.customer?.cus_phone_no || 'N/A'}</strong></Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Address: <strong>{viewingPurchase.customer?.cus_address || 'N/A'}</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flex: '0 0 50%' }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Invoice No: <strong>#{viewingPurchase.pur_id}</strong></Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Time: <strong>{new Date(viewingPurchase.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Date: <strong>{new Date(viewingPurchase.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></Typography>
                  {viewingPurchase.vehicle_no && (<Typography variant="body2">Vehicle No: <strong>{viewingPurchase.vehicle_no}</strong></Typography>)}
                  {viewingPurchase.cargo_account && (<Typography variant="body2">Cargo Account: <strong>{viewingPurchase.cargo_account?.cus_name || 'N/A'}</strong></Typography>)}

                  {viewingPurchase.cargo_account_ids && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(() => {
                        try {
                          const ids = Array.isArray(viewingPurchase.cargo_account_ids) ? viewingPurchase.cargo_account_ids : JSON.parse(viewingPurchase.cargo_account_ids || '[]');
                          return ids.map(id => {
                            const c = customers.find(cc => cc.cus_id === parseInt(id));
                            return <Chip key={id} label={c ? c.cus_name : String(id)} size="small" sx={{ bgcolor: 'error.main', color: 'white', borderRadius: '16px' }} />;
                          });
                        } catch (err) {
                          return null;
                        }
                      })()}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Product table + totals (same layout as Purchases page) */}
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
                        <>
                          {viewingPurchase.purchase_details.map((detail, index) => (
                            <TableRow key={detail.pur_detail_id || index}>
                              <TableCell sx={{ px: 1 }}>{index + 1}</TableCell>
                              <TableCell sx={{ px: 1 }}>{detail.product?.pro_title || detail.pro_title || 'N/A'}</TableCell>
                              <TableCell sx={{ px: 1 }} align="right">{detail.qnty || 0}</TableCell>
                              <TableCell sx={{ px: 1 }} align="right">{fmtAmt(detail.unit_rate || detail.rate)}</TableCell>
                              <TableCell sx={{ px: 1 }} align="right">{fmtAmt(detail.total_amount || detail.amount)}</TableCell>
                            </TableRow>
                          ))}

                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ px: 1 }} />
                            <TableCell sx={{ px: 1, fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell sx={{ px: 1, fontWeight: 'bold' }} align="right">{(viewingPurchase.purchase_details || []).reduce((s, d) => s + parseFloat(d.qnty || 0), 0)}</TableCell>
                            <TableCell sx={{ px: 1 }} align="right" />
                            <TableCell sx={{ px: 1, fontWeight: 'bold' }} align="right">{((viewingPurchase.purchase_details || []).reduce((s, d) => s + parseFloat(d.total_amount || d.amount || 0), 0)).toFixed(2)}</TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No items found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: '0 0 48%' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, border: '1px solid #000', width: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          {(() => {
                            const previousBalance = parseFloat((viewingPurchase.previous_customer_balance ?? viewingPurchase.customer?.cus_balance) || 0);
                            const invoiceNet = viewingPurchase.display_net_total ?? 0;
                            const payment = parseFloat(viewingPurchase.payment || 0);

                            return (
                              <>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>Previous Balance</TableCell>
                                  <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(previousBalance)}</TableCell>
                                </TableRow>

                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>Current Balance</TableCell>
                                  <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(invoiceNet - payment)}</TableCell>
                                </TableRow>

                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                  <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd' }}>Total Balance</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd' }}>{fmtAmt(previousBalance + invoiceNet - payment)}</TableCell>
                                </TableRow>
                              </>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  <Box sx={{ flex: '0 0 48%', display: 'flex', justifyContent: 'flex-end' }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000', width: '100%', maxWidth: '100%' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Goods Total</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.total_amount)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Labour</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.labour_amount)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Transport</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.transport_amount)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Out Labour</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.out_labour_amount)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Out Delivery</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.out_delivery_amount)}</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Invoice Total</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.display_net_total || parseFloat(viewingPurchase.total_amount || 0) + parseFloat(viewingPurchase.unloading_amount || 0) + parseFloat(viewingPurchase.transport_amount || 0) + parseFloat(viewingPurchase.labour_amount || 0) + parseFloat(viewingPurchase.fare_amount || 0) - parseFloat(viewingPurchase.discount || 0))}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{viewingPurchase.bank_payment > 0 ? (viewingPurchase.bank_title || 'Bank Payment') : 'Bank Payment'}</TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem', fontWeight: 'bold' }}>{fmtAmt(viewingPurchase.bank_payment)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Total Payment</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{fmtAmt(viewingPurchase.payment)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', direction: 'rtl', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>Balance Due</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5, border: '1px solid #ddd', fontSize: '0.875rem' }}>{((viewingPurchase.display_net_total || parseFloat(viewingPurchase.total_amount || 0) + parseFloat(viewingPurchase.unloading_amount || 0) + parseFloat(viewingPurchase.transport_amount || 0) + parseFloat(viewingPurchase.labour_amount || 0) + parseFloat(viewingPurchase.fare_amount || 0) - parseFloat(viewingPurchase.discount || 0)) - parseFloat(viewingPurchase.payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
          <Button onClick={() => { setViewPurchaseDialogOpen(false); setViewingPurchase(null); }} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

    </DashboardLayout>
  );
}
