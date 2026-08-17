'use client';

import React from 'react';
import { Receipt, Banknote, CreditCard } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

/**
 * Expense Statistics Header Cards Component.
 */
const ExpenseStats = React.memo(function ExpenseStats({
  totalExpenseAmount,
  totalExpenses,
  cashExpenseAmount,
  cashExpensesCount,
  bankExpenseAmount,
  bankExpensesCount,
}) {
  return (
    <div className="flex-shrink-0 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Expenses"
          value={totalExpenseAmount}
          count={totalExpenses}
          countLabel="Items"
          subtitle="Total volume"
          icon={Receipt}
          accentColor="gray"
        />

        <StatCard
          title="Paid via Cash"
          value={cashExpenseAmount}
          count={cashExpensesCount}
          countLabel="Items"
          subtitle="Cash account payments"
          icon={Banknote}
          accentColor="green"
        />

        <StatCard
          title="Paid via Bank"
          value={bankExpenseAmount}
          count={bankExpensesCount}
          countLabel="Items"
          subtitle="Bank account payments"
          icon={CreditCard}
          accentColor="blue"
        />
      </div>
    </div>
  );
});

export default ExpenseStats;
