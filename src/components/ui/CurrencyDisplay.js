'use client';

import React from 'react';

/**
 * Currency Display helper component.
 */
const CurrencyDisplay = React.memo(function CurrencyDisplay({
  value = 0,
  currency = 'Rs.',
  className = '',
  symbolClassName = 'text-[10px] mr-0.5 opacity-70',
}) {
  const n = parseFloat(value || 0);
  const formatted = n % 1 === 0
    ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <span className={className}>
      {currency && <span className={symbolClassName}>{currency}</span>}
      {formatted}
    </span>
  );
});

export default CurrencyDisplay;
