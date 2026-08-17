'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';
import ExpenseStats from './components/ExpenseStats';
import ExpenseTable from './components/ExpenseTable';
import ExpenseFormModal from './components/ExpenseFormModal';
import ExpenseTypeModal from './components/ExpenseTypeModal';

export default function ExpensesPage() {
  // State management
  const [expenses, setExpenses] = useState([]);
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpenseType, setSelectedExpenseType] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form data
  const [formData, setFormData] = useState({
    exp_title: '',
    exp_type: '',
    exp_detail: '',
    exp_amount: '',
    is_paid: 'true',
    paid_from_account_id: '',
    bank_account_id: '',
    cash_amount: '',
    bank_amount: '',
    payment_reference: '',
    paymentMethod: 'CASH',
  });

  // Expense Type Dialog State
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isSubmittingType, setIsSubmittingType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-select default cash account when loading or when payment method changes
  useEffect(() => {
    if (
      paymentAccounts.length > 0 &&
      !formData.paid_from_account_id &&
      (formData.paymentMethod === 'CASH' || formData.paymentMethod === 'PARTIAL')
    ) {
      const defaultCashAcc = paymentAccounts.find((acc) => {
        const typeTitle = acc.customer_type?.cus_type_title?.toLowerCase() || '';
        const catTitle = acc.customer_category?.cus_cat_title?.toLowerCase() || '';
        return typeTitle.includes('cash') && catTitle.includes('cash');
      });
      if (defaultCashAcc) {
        setFormData((prev) => ({
          ...prev,
          paid_from_account_id: defaultCashAcc.cus_id.toString(),
        }));
      }
    }
  }, [paymentAccounts, formData.paymentMethod, formData.paid_from_account_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesRes, expenseTitlesRes, accountsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/expense-titles'),
        fetch('/api/customers?dropdown=true'),
      ]);

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
      if (expenseTitlesRes.ok) {
        const expenseTitlesData = await expenseTitlesRes.json();
        setExpenseTitles(expenseTitlesData);
      }
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setPaymentAccounts(accountsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoized filter options for cash and bank accounts
  const cashAccountsList = useMemo(() => {
    return paymentAccounts.filter((account) => {
      const typeTitle = account.customer_type?.cus_type_title?.toLowerCase() || '';
      const catTitle = account.customer_category?.cus_cat_title?.toLowerCase() || '';
      return typeTitle.includes('cash') && catTitle.includes('cash');
    });
  }, [paymentAccounts]);

  const bankAccountsList = useMemo(() => {
    return paymentAccounts.filter((account) => {
      const typeTitle = account.customer_type?.cus_type_title?.toLowerCase() || '';
      const catTitle = account.customer_category?.cus_cat_title?.toLowerCase() || '';
      return typeTitle.includes('bank') && catTitle.includes('bank');
    });
  }, [paymentAccounts]);

  // Filter and sort logic
  const finalExpenses = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const matchesSearch =
        expense.exp_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.exp_detail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.expense_title?.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !selectedExpenseType || expense.exp_type == selectedExpenseType;
      return matchesSearch && matchesType;
    });

    const sorted = filtered.sort((a, b) => {
      let aValue, bValue;
      if (sortBy === 'created_at') {
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
      } else if (sortBy === 'exp_amount') {
        aValue = parseFloat(a.exp_amount);
        bValue = parseFloat(b.exp_amount);
      } else if (sortBy === 'exp_title') {
        aValue = a.exp_title.toLowerCase();
        bValue = b.exp_title.toLowerCase();
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

    return sorted.map((expense, index) => ({
      ...expense,
      sequentialId: index + 1,
    }));
  }, [expenses, searchTerm, selectedExpenseType, sortBy, sortOrder]);

  // Stats calculations
  const totalExpensesCount = expenses.length;
  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.exp_amount), 0);
  }, [expenses]);

  const cashExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const hasNewCashField = parseFloat(expense.cash_amount || 0) > 0;
      const hasNewBankField = parseFloat(expense.bank_amount || 0) > 0;
      if (hasNewCashField || hasNewBankField) {
        return sum + parseFloat(expense.cash_amount || 0);
      } else {
        const name = expense.paid_from_account?.cus_name?.toLowerCase() || '';
        return sum + (!name.includes('bank') ? parseFloat(expense.exp_amount || 0) : 0);
      }
    }, 0);
  }, [expenses]);

  const bankExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const hasNewCashField = parseFloat(expense.cash_amount || 0) > 0;
      const hasNewBankField = parseFloat(expense.bank_amount || 0) > 0;
      if (hasNewCashField || hasNewBankField) {
        return sum + parseFloat(expense.bank_amount || 0);
      } else {
        const name = expense.paid_from_account?.cus_name?.toLowerCase() || '';
        return sum + (name.includes('bank') ? parseFloat(expense.exp_amount || 0) : 0);
      }
    }, 0);
  }, [expenses]);

  const cashExpensesCount = useMemo(() => {
    return expenses.filter((expense) => {
      const hasNewCashField = parseFloat(expense.cash_amount || 0) > 0;
      const hasNewBankField = parseFloat(expense.bank_amount || 0) > 0;
      if (hasNewCashField || hasNewBankField) {
        return hasNewCashField;
      } else {
        const name = expense.paid_from_account?.cus_name?.toLowerCase() || '';
        return !name.includes('bank');
      }
    }).length;
  }, [expenses]);

  const bankExpensesCount = useMemo(() => {
    return expenses.filter((expense) => {
      const hasNewCashField = parseFloat(expense.cash_amount || 0) > 0;
      const hasNewBankField = parseFloat(expense.bank_amount || 0) > 0;
      if (hasNewCashField || hasNewBankField) {
        return hasNewBankField;
      } else {
        const name = expense.paid_from_account?.cus_name?.toLowerCase() || '';
        return name.includes('bank');
      }
    }).length;
  }, [expenses]);

  // Form & Action Handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    setEditingExpense(null);
    const defaultCashAcc = paymentAccounts.find((acc) => {
      const typeTitle = acc.customer_type?.cus_type_title?.toLowerCase() || '';
      const catTitle = acc.customer_category?.cus_cat_title?.toLowerCase() || '';
      return typeTitle.includes('cash') && catTitle.includes('cash');
    });
    setFormData({
      exp_title: '',
      exp_type: '',
      exp_detail: '',
      exp_amount: '',
      is_paid: 'true',
      paid_from_account_id: defaultCashAcc ? defaultCashAcc.cus_id.toString() : '',
      bank_account_id: '',
      cash_amount: '',
      bank_amount: '',
      payment_reference: '',
      paymentMethod: 'CASH',
    });
    setCurrentView('create');
  }, [paymentAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.exp_title.trim()) {
      alert('Please enter an expense title');
      return;
    }
    if (!formData.exp_type) {
      alert('Please select an expense category / type');
      return;
    }
    if (!formData.exp_amount || parseFloat(formData.exp_amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (formData.paymentMethod === 'CASH') {
      if (!formData.paid_from_account_id) {
        alert('Please select a cash account');
        return;
      }
    } else if (formData.paymentMethod === 'BANK') {
      if (!formData.bank_account_id) {
        alert('Please select a bank account');
        return;
      }
    } else if (formData.paymentMethod === 'PARTIAL') {
      if (!formData.paid_from_account_id || !formData.bank_account_id) {
        alert('Please select both cash and bank accounts');
        return;
      }
      const total = parseFloat(formData.exp_amount || 0);
      const cash = parseFloat(formData.cash_amount || 0);
      const bank = parseFloat(formData.bank_amount || 0);
      if (cash <= 0 || bank <= 0) {
        alert('Both cash and bank amounts must be greater than zero for partial payments');
        return;
      }
      if (Math.abs(cash + bank - total) > 0.01) {
        alert(`Sum of cash (Rs. ${cash.toLocaleString()}) and bank (Rs. ${bank.toLocaleString()}) must equal total amount (Rs. ${total.toLocaleString()})`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const url = '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      const body = editingExpense ? { id: editingExpense.exp_id, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingExpense(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback((expense) => {
    setEditingExpense(expense);
    const cashAmt = parseFloat(expense.cash_amount || 0);
    const bankAmt = parseFloat(expense.bank_amount || 0);
    let method = 'CASH';
    if (cashAmt > 0 && bankAmt > 0) {
      method = 'PARTIAL';
    } else if (bankAmt > 0) {
      method = 'BANK';
    } else if (expense.paid_from_account?.cus_name?.toLowerCase().includes('bank')) {
      method = 'BANK';
    }

    setFormData({
      exp_title: expense.exp_title,
      exp_type: expense.exp_type,
      exp_detail: expense.exp_detail || '',
      exp_amount: expense.exp_amount.toString(),
      is_paid: 'true',
      paid_from_account_id: expense.paid_from_account_id ? expense.paid_from_account_id.toString() : '',
      bank_account_id: expense.bank_account_id ? expense.bank_account_id.toString() : (method === 'BANK' ? expense.paid_from_account_id?.toString() || '' : ''),
      cash_amount: cashAmt > 0 ? cashAmt.toString() : '',
      bank_amount: bankAmt > 0 ? bankAmt.toString() : '',
      payment_reference: expense.payment_reference || '',
      paymentMethod: method,
    });
    setCurrentView('create');
  }, []);

  const handleDelete = useCallback(async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(`/api/expenses?id=${expenseId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          await fetchData();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete expense');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
    }
  }, []);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      setIsSubmittingType(true);
      const response = await fetch('/api/expense-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTypeName }),
      });
      if (response.ok) {
        const result = await response.json();
        setExpenseTitles((prev) => [...prev, result]);
        setFormData((prev) => ({ ...prev, exp_type: result.id }));
        setShowTypeDialog(false);
        setNewTypeName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create expense type');
      }
    } catch (error) {
      console.error('Error creating expense type:', error);
      alert('Failed to create expense type');
    } finally {
      setIsSubmittingType(false);
    }
  };

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedExpenseType('');
    setSortBy('created_at');
    setSortOrder('desc');
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <PageHeader
          title="Expense Management"
          subtitle="Track and manage business expenses"
          actionButtonText="Add New Expense"
          actionButtonIcon={Plus}
          onActionButtonClick={handleOpenCreateModal}
          actionGradient="from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
        />

        {/* Filters */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search expenses..."
          filters={[
            {
              label: 'Expense Type',
              value: selectedExpenseType,
              onChange: setSelectedExpenseType,
              options: [
                { value: '', label: 'All Types' },
                ...expenseTitles.map((t) => ({ value: t.id, label: t.title })),
              ],
            },
          ]}
          onClearFilters={clearFilters}
        />

        {/* Stats Section */}
        <ExpenseStats
          totalExpenseAmount={totalExpenseAmount}
          totalExpenses={totalExpensesCount}
          cashExpenseAmount={cashExpenseAmount}
          cashExpensesCount={cashExpensesCount}
          bankExpenseAmount={bankExpenseAmount}
          bankExpensesCount={bankExpensesCount}
        />

        {/* Table Section */}
        <ExpenseTable
          expenses={finalExpenses}
          totalCount={expenses.length}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Add / Edit Expense Modal */}
      <ExpenseFormModal
        isOpen={currentView === 'create'}
        onClose={() => setCurrentView('list')}
        editingExpense={editingExpense}
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
        expenseTitles={expenseTitles}
        cashAccountsList={cashAccountsList}
        bankAccountsList={bankAccountsList}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onOpenTypeDialog={() => setShowTypeDialog(true)}
      />

      {/* Add Expense Type Modal */}
      <ExpenseTypeModal
        isOpen={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        newTypeName={newTypeName}
        setNewTypeName={setNewTypeName}
        onSubmit={handleCreateType}
        isSubmitting={isSubmittingType}
      />
    </DashboardLayout>
  );
}
