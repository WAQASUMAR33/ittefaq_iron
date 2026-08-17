'use client';

import React from 'react';
import { getStatusTheme } from '@/lib/theme-colors';

/**
 * Reusable StatusBadge component for consistent status pills across tables and details.
 */
const StatusBadge = React.memo(function StatusBadge({ status, label, className = '' }) {
  const displayLabel = label || status;
  const theme = getStatusTheme(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${className}`}
      style={{
        backgroundColor: theme.light,
        color: theme.text,
        border: `1px solid ${theme.border}`,
      }}
    >
      {displayLabel}
    </span>
  );
});

export default StatusBadge;
