'use client';

import React from 'react';

/**
 * Reusable Data Table Component.
 */
const DataTable = React.memo(function DataTable({
  columns = [], // Array of { key, label, width, align: 'left'|'center'|'right', render: (row, index) => ReactNode }
  data = [],
  keyExtractor = (row, idx) => row.id || idx,
  emptyMessage = 'No items found.',
  emptyIcon: EmptyIcon,
  loading = false,
  className = '',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          {EmptyIcon && <EmptyIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />}
          <h3 className="text-sm font-medium text-gray-900">{emptyMessage}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-lg border border-gray-100/50 overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {columns.map((col) => (
            <div
              key={col.key}
              className={`${col.width || 'col-span-1'} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
        {data.map((row, idx) => (
          <div
            key={keyExtractor(row, idx)}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150 items-center text-sm"
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={`${col.width || 'col-span-1'} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} min-w-0`}
              >
                {col.render ? col.render(row, idx) : row[col.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export default DataTable;
