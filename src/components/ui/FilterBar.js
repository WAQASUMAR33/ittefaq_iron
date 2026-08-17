'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

/**
 * Reusable FilterBar component.
 */
const FilterBar = React.memo(function FilterBar({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [], // Array of { label, value, onChange, options: [{ value, label }] }
  onClearFilters,
  className = '',
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Search Field */}
        {onSearchChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>
        )}

        {/* Dynamic Filters */}
        {filters.map((filter, idx) => (
          <div key={idx}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{filter.label}</label>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm appearance-none bg-white"
            >
              {filter.options.map((opt, optIdx) => (
                <option key={optIdx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
});

export default FilterBar;
