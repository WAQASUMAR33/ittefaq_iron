'use client';

import React from 'react';

/**
 * Standardized Page Header Component.
 */
const PageHeader = React.memo(function PageHeader({
  title,
  subtitle,
  actionButtonText,
  actionButtonIcon: ActionIcon,
  onActionButtonClick,
  actionGradient = 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
  secondaryAction,
}) {
  return (
    <div className="flex-shrink-0 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {secondaryAction}
          {actionButtonText && onActionButtonClick && (
            <button
              onClick={onActionButtonClick}
              className={`group bg-gradient-to-r ${actionGradient} text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center`}
            >
              {ActionIcon && (
                <ActionIcon className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
              )}
              {actionButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default PageHeader;
