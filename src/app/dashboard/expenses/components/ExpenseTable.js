'use client';

import React from 'react';
import { Edit, Trash2, Banknote, CreditCard, Receipt } from 'lucide-react';
import { formatDatePK } from '@/lib/date-helper';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import DataTable from '@/components/ui/DataTable';

/**
 * Expenses Table Component.
 */
const ExpenseTable = React.memo(function ExpenseTable({
  expenses = [],
  totalCount = 0,
  onEdit,
  onDelete,
}) {
  const columns = [
    {
      key: 'sequentialId',
      label: 'ID',
      width: 'col-span-1',
      render: (expense) => (
        <div>
          <div className="text-sm font-medium text-gray-900">#{expense.sequentialId}</div>
          <div className="text-xs text-gray-500 font-mono">ID: {expense.exp_id.toString().slice(-8)}</div>
        </div>
      ),
    },
    {
      key: 'exp_title',
      label: 'Title',
      width: 'col-span-3',
      render: (expense) => (
        <div className="w-full min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate" title={expense.exp_title}>
            {expense.exp_title}
          </div>
          {expense.exp_detail && (
            <div className="text-xs text-gray-500 truncate" title={expense.exp_detail}>
              {expense.exp_detail}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'exp_type',
      label: 'Type',
      width: 'col-span-2',
      render: (expense) => (
        <span className="text-sm font-medium text-gray-800">
          {expense.expense_title?.title || 'N/A'}
        </span>
      ),
    },
    {
      key: 'exp_amount',
      label: 'Amount',
      width: 'col-span-1',
      render: (expense) => (
        <CurrencyDisplay
          value={expense.exp_amount}
          className="text-sm font-bold text-red-600"
        />
      ),
    },
    {
      key: 'paid_from',
      label: 'Paid From',
      width: 'col-span-3',
      render: (expense) => {
        const cashAmt = parseFloat(expense.cash_amount || 0);
        const bankAmt = parseFloat(expense.bank_amount || 0);

        if (expense.paid_from_account && (cashAmt > 0 && bankAmt === 0 || cashAmt === 0 && bankAmt === 0 && !expense.paid_from_account.cus_name?.toLowerCase().includes('bank'))) {
          return (
            <div className="flex items-center w-full">
              <div className="flex-shrink-0 w-7 h-7 bg-green-50 rounded-full flex items-center justify-center mr-2 border border-green-100">
                <Banknote className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="truncate w-full">
                <div className="text-sm font-medium text-gray-900 truncate" title={expense.paid_from_account.cus_name}>
                  {expense.paid_from_account.cus_name}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {expense.payment_date ? formatDatePK(expense.payment_date) : ''}
                </div>
              </div>
            </div>
          );
        }

        const bankAcc = expense.bank_account || (expense.paid_from_account && expense.paid_from_account.cus_name?.toLowerCase().includes('bank') ? expense.paid_from_account : null);
        if (bankAcc && (bankAmt > 0 && cashAmt === 0 || cashAmt === 0 && bankAmt === 0)) {
          return (
            <div className="flex items-center w-full">
              <div className="flex-shrink-0 w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center mr-2 border border-blue-100">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="truncate w-full">
                <div className="text-sm font-medium text-gray-900 truncate" title={bankAcc.cus_name}>
                  {bankAcc.cus_name}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {expense.payment_date ? formatDatePK(expense.payment_date) : ''}
                </div>
              </div>
            </div>
          );
        }

        if (expense.paid_from_account && expense.bank_account && cashAmt > 0 && bankAmt > 0) {
          return (
            <div className="flex flex-col w-full text-xs space-y-1">
              <div className="flex items-center text-green-700 font-medium truncate" title={expense.paid_from_account.cus_name}>
                <Banknote className="w-3 h-3 mr-1 flex-shrink-0 text-green-500" />
                Cash: Rs. {cashAmt.toLocaleString()}
              </div>
              <div className="flex items-center text-blue-700 font-medium truncate" title={expense.bank_account.cus_name}>
                <CreditCard className="w-3 h-3 mr-1 flex-shrink-0 text-blue-500" />
                Bank: Rs. {bankAmt.toLocaleString()}
              </div>
            </div>
          );
        }

        return <span className="text-sm text-gray-300 italic">—</span>;
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 'col-span-1',
      align: 'center',
      render: (expense) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatDatePK(expense.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 'col-span-1',
      align: 'right',
      render: (expense) => (
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={() => onEdit(expense)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(expense.exp_id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-shrink-0 mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">
          Showing {expenses.length} of {totalCount} expenses
        </span>
      </div>
      <DataTable
        columns={columns}
        data={expenses}
        keyExtractor={(item) => item.exp_id}
        emptyMessage="No expenses found matching your criteria."
        emptyIcon={Receipt}
      />
    </div>
  );
});

export default ExpenseTable;
