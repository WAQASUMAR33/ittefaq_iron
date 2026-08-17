'use client';

import React from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal Dialog Component.
 */
const ModalDialog = React.memo(function ModalDialog({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconColor = 'text-blue-600',
  maxWidth = 'max-w-3xl',
  children,
  footer,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className={`bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-100 ${maxWidth} w-full p-6 sm:p-8 relative max-h-[90vh] flex flex-col my-auto transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            {Icon && <Icon className={`w-5 h-5 mr-2 ${iconColor}`} />}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-5 pr-1">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="pt-4 border-t border-gray-200 flex-shrink-0 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default ModalDialog;
