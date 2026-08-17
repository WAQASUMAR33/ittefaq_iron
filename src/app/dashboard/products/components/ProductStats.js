'use client';

import React from 'react';
import { Package, Boxes, AlertTriangle, TrendingUp } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

/**
 * Product Statistics Header Cards Component.
 */
const ProductStats = React.memo(function ProductStats({
  totalProducts = 0,
  totalStockValue = 0,
  lowStockCount = 0,
  outOfStockCount = 0,
}) {
  return (
    <div className="flex-shrink-0 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Products"
          value={totalProducts}
          currency=""
          count={totalProducts}
          countLabel="Items"
          subtitle="Catalog size"
          icon={Package}
          accentColor="blue"
        />

        <StatCard
          title="Total Stock Value"
          value={totalStockValue}
          subtitle="Inventory valuation"
          icon={TrendingUp}
          accentColor="green"
        />

        <StatCard
          title="Low Stock Items"
          value={lowStockCount}
          currency=""
          count={lowStockCount}
          countLabel="Items"
          subtitle="Re-order needed soon"
          icon={Boxes}
          accentColor="amber"
        />

        <StatCard
          title="Out of Stock"
          value={outOfStockCount}
          currency=""
          count={outOfStockCount}
          countLabel="Items"
          subtitle="Immediate restock required"
          icon={AlertTriangle}
          accentColor="red"
        />
      </div>
    </div>
  );
});

export default ProductStats;
