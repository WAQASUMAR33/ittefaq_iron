'use client';

import React from 'react';

/**
 * Reusable StatCard component for summary metrics across dashboard pages.
 * Wrapped in React.memo for high render performance.
 */
const StatCard = React.memo(function StatCard({
  title,
  value = 0,
  currency = 'Rs.',
  count,
  countLabel = 'Items',
  subtitle,
  icon: Icon,
  accentColor = 'blue',
  borderColor,
  onClick,
}) {
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : value;

  const colorStyles = {
    blue: { border: 'border-l-blue-500', text: 'text-blue-600', valText: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    green: { border: 'border-l-green-500', text: 'text-green-600', valText: 'text-green-700', badge: 'bg-green-100 text-green-700' },
    red: { border: 'border-l-red-500', text: 'text-red-600', valText: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    amber: { border: 'border-l-amber-500', text: 'text-amber-600', valText: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    purple: { border: 'border-l-purple-500', text: 'text-purple-600', valText: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    gray: { border: 'border-l-gray-400', text: 'text-gray-600', valText: 'text-gray-900', badge: 'bg-gray-100 text-gray-700' },
  }[accentColor] || { border: 'border-l-blue-500', text: 'text-blue-600', valText: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 relative overflow-hidden group border-l-4 ${colorStyles.border} ${onClick ? 'cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5' : ''}`}
    >
      {Icon && (
        <div className="absolute top-0 right-0 p-4 opacity-[0.07] group-hover:opacity-15 transition-opacity">
          <Icon className="w-16 h-16 text-gray-900" />
        </div>
      )}
      <div className="flex flex-col">
        <p className={`text-sm font-semibold ${colorStyles.text} mb-1`}>{title}</p>
        <p className={`text-3xl font-black ${colorStyles.valText}`}>
          {currency && <span className="text-sm mr-1">{currency}</span>}
          {formattedValue}
        </p>

        {(count !== undefined || subtitle) && (
          <div className="flex items-center mt-4 pt-4 border-t border-gray-50">
            {count !== undefined && (
              <span className={`px-2 py-1 rounded text-xs font-bold mr-2 uppercase tracking-wide ${colorStyles.badge}`}>
                {count} {countLabel}
              </span>
            )}
            {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
});

export default StatCard;
