'use client';

import React from 'react';
import { Plus, Receipt, Banknote, CreditCard, DollarSign } from 'lucide-react';
import { Autocomplete, TextField } from '@mui/material';
import ModalDialog from '@/components/ui/ModalDialog';

/**
 * Expense Form Modal Component for creating and editing expenses.
 */
const ExpenseFormModal = React.memo(function ExpenseFormModal({
  isOpen,
  onClose,
  editingExpense,
  formData,
  handleInputChange,
  setFormData,
  expenseTitles,
  cashAccountsList,
  bankAccountsList,
  onSubmit,
  isSubmitting,
  onOpenTypeDialog,
}) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpense ? 'Edit Expense' : 'Create New Expense'}
      icon={Receipt}
      iconColor="text-red-500"
      maxWidth="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-modal-form"
            disabled={isSubmitting}
            className={`px-7 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-105'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {editingExpense ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              editingExpense ? 'Update Expense' : 'Create Expense'
            )}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} id="expense-modal-form" className="space-y-5">
        {/* 2-Column Grid for Title & Filterable Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Expense Title *
            </label>
            <TextField
              fullWidth
              name="exp_title"
              value={formData.exp_title}
              onChange={handleInputChange}
              required
              size="small"
              variant="outlined"
              placeholder="Enter expense title (e.g., Office Supplies, Rent)"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Category / Expense Type *
              </label>
              <button
                type="button"
                onClick={onOpenTypeDialog}
                className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center bg-red-50 px-2.5 py-1 rounded-md border border-red-100 transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add New Type
              </button>
            </div>
            <Autocomplete
              options={expenseTitles}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.title || '')}
              value={expenseTitles.find((t) => t.id == formData.exp_type) || null}
              onChange={(event, newValue) => {
                setFormData((prev) => ({ ...prev, exp_type: newValue ? newValue.id : '' }));
              }}
              isOptionEqualToValue={(option, value) => option.id == value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to filter category..."
                  size="small"
                  required={!formData.exp_type}
                  fullWidth
                  variant="outlined"
                />
              )}
            />
          </div>
        </div>

        {/* 2-Column Grid for Amount & Payment Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount *
            </label>
            <TextField
              fullWidth
              type="number"
              name="exp_amount"
              value={formData.exp_amount}
              onChange={handleInputChange}
              required
              inputProps={{ step: '0.01', min: '0.01' }}
              size="small"
              variant="outlined"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Payment Reference (Optional)
            </label>
            <TextField
              fullWidth
              name="payment_reference"
              value={formData.payment_reference || ''}
              onChange={handleInputChange}
              size="small"
              variant="outlined"
              placeholder="e.g., Check #1234, Transfer ID"
            />
          </div>
        </div>

        {/* Payment Method Choice */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method *
          </label>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'CASH', paid_from_account_id: '', bank_account_id: '', cash_amount: '', bank_amount: '' }))}
              className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                formData.paymentMethod === 'CASH'
                  ? 'border-green-500 bg-green-50 text-green-700 font-bold shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-500 font-medium hover:border-gray-300'
              }`}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Cash
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'BANK', paid_from_account_id: '', bank_account_id: '', cash_amount: '', bank_amount: '' }))}
              className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                formData.paymentMethod === 'BANK'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-500 font-medium hover:border-gray-300'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Bank
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'PARTIAL', paid_from_account_id: '', bank_account_id: '', cash_amount: '', bank_amount: '' }))}
              className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                formData.paymentMethod === 'PARTIAL'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-500 font-medium hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Partial
            </button>
          </div>
        </div>

        {/* Account Selection */}
        {formData.paymentMethod === 'CASH' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cash Account *
            </label>
            <Autocomplete
              options={cashAccountsList}
              getOptionLabel={(account) => `${account.cus_name} (Balance: Rs. ${parseFloat(account.cus_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})`}
              value={cashAccountsList.find((a) => a.cus_id.toString() === formData.paid_from_account_id) || null}
              onChange={(event, newValue) => {
                setFormData((prev) => ({ ...prev, paid_from_account_id: newValue ? newValue.cus_id.toString() : '' }));
              }}
              isOptionEqualToValue={(option, value) => option.cus_id === value.cus_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to filter cash account..."
                  size="small"
                  required={!formData.paid_from_account_id}
                  fullWidth
                  variant="outlined"
                />
              )}
            />
          </div>
        )}

        {formData.paymentMethod === 'BANK' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bank Account *
            </label>
            <Autocomplete
              options={bankAccountsList}
              getOptionLabel={(account) => `${account.cus_name} (Balance: Rs. ${parseFloat(account.cus_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})`}
              value={bankAccountsList.find((a) => a.cus_id.toString() === formData.bank_account_id) || null}
              onChange={(event, newValue) => {
                setFormData((prev) => ({ ...prev, bank_account_id: newValue ? newValue.cus_id.toString() : '' }));
              }}
              isOptionEqualToValue={(option, value) => option.cus_id === value.cus_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to filter bank account..."
                  size="small"
                  required={!formData.bank_account_id}
                  fullWidth
                  variant="outlined"
                />
              )}
            />
          </div>
        )}

        {formData.paymentMethod === 'PARTIAL' && (
          <div className="space-y-3 bg-purple-50/60 p-4 sm:p-5 rounded-2xl border border-purple-100">
            <h5 className="text-xs font-bold text-purple-900 flex items-center uppercase tracking-wide">
              <DollarSign className="w-4 h-4 mr-1 text-purple-600" /> Split Payment Details
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Cash Account *</label>
                <Autocomplete
                  options={cashAccountsList}
                  getOptionLabel={(account) => account.cus_name}
                  value={cashAccountsList.find((a) => a.cus_id.toString() === formData.paid_from_account_id) || null}
                  onChange={(event, newValue) => {
                    setFormData((prev) => ({ ...prev, paid_from_account_id: newValue ? newValue.cus_id.toString() : '' }));
                  }}
                  isOptionEqualToValue={(option, value) => option.cus_id === value.cus_id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select Cash Acc..."
                      size="small"
                      required={!formData.paid_from_account_id}
                      fullWidth
                      variant="outlined"
                    />
                  )}
                />

                <label className="block text-xs font-semibold text-gray-700 mt-2">Cash Amount *</label>
                <TextField
                  fullWidth
                  type="number"
                  name="cash_amount"
                  value={formData.cash_amount || ''}
                  onChange={handleInputChange}
                  required
                  inputProps={{ step: '0.01', min: '0.01' }}
                  size="small"
                  variant="outlined"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Bank Account *</label>
                <Autocomplete
                  options={bankAccountsList}
                  getOptionLabel={(account) => account.cus_name}
                  value={bankAccountsList.find((a) => a.cus_id.toString() === formData.bank_account_id) || null}
                  onChange={(event, newValue) => {
                    setFormData((prev) => ({ ...prev, bank_account_id: newValue ? newValue.cus_id.toString() : '' }));
                  }}
                  isOptionEqualToValue={(option, value) => option.cus_id === value.cus_id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select Bank Acc..."
                      size="small"
                      required={!formData.bank_account_id}
                      fullWidth
                      variant="outlined"
                    />
                  )}
                />

                <label className="block text-xs font-semibold text-gray-700 mt-2">Bank Amount *</label>
                <TextField
                  fullWidth
                  type="number"
                  name="bank_amount"
                  value={formData.bank_amount || ''}
                  onChange={handleInputChange}
                  required
                  inputProps={{ step: '0.01', min: '0.01' }}
                  size="small"
                  variant="outlined"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Live calculation banner */}
            {parseFloat(formData.exp_amount || 0) > 0 && (
              <div className="mt-2 pt-2 border-t border-purple-200 flex justify-between items-center text-xs">
                <span className="text-gray-600">
                  Total: <strong className="text-gray-900 font-bold">Rs. {parseFloat(formData.exp_amount || 0).toLocaleString()}</strong>
                </span>
                <span className="text-gray-600">
                  Allocated: <strong className="text-gray-900 font-bold">Rs. {(parseFloat(formData.cash_amount || 0) + parseFloat(formData.bank_amount || 0)).toLocaleString()}</strong>
                </span>
                {(() => {
                  const remaining = parseFloat(formData.exp_amount || 0) - parseFloat(formData.cash_amount || 0) - parseFloat(formData.bank_amount || 0);
                  if (Math.abs(remaining) < 0.01) {
                    return <span className="text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">Fully Allocated</span>;
                  } else if (remaining > 0) {
                    return <span className="text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">Remaining: Rs. {remaining.toLocaleString()}</span>;
                  } else {
                    return <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">Over allocated: Rs. {Math.abs(remaining).toLocaleString()}</span>;
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {/* Detail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Expense Detail
          </label>
          <TextField
            fullWidth
            multiline
            rows={2}
            name="exp_detail"
            value={formData.exp_detail}
            onChange={handleInputChange}
            placeholder="Enter additional details about the expense"
            size="small"
            variant="outlined"
          />
        </div>
      </form>
    </ModalDialog>
  );
});

export default ExpenseFormModal;
