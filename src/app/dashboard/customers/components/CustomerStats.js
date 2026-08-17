'use client';

import React from 'react';
import { Users, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

/**
 * Customer Metrics Header Cards Component.
 */
const CustomerStats = React.memo(function CustomerStats({
  totalCustomers,
  totalReceivables,
  totalPayables,
  netBalance,
}) {
  return (
    <div className="flex-shrink-0 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Customers / Accounts"
          value={totalCustomers}
          currency=""
          count={totalCustomers}
          countLabel="Accounts"
          icon={Users}
          accentColor="blue"
        />

        <StatCard
          title="Total Receivables (Debit)"
          value={totalReceivables}
          subtitle="Customers owing money"
          icon={TrendingUp}
          accentColor="green"
        />

        <StatCard
          title="Total Payables (Credit)"
          value={totalPayables}
          subtitle="Advance payments received"
          icon={TrendingDown}
          accentColor="red"
        />

        <StatCard
          title="Net Balance"
          value={netBalance}
          subtitle="Net accounts balance"
          icon={Wallet}
          accentColor={netBalance >= 0 ? 'amber' : 'purple'}
        />
      </div>
    </div>
  );
});

export default CustomerStats;
