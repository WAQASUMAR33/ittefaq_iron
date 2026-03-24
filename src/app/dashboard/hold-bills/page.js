'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Package, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  Eye,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return fmtAmt(n);
};

export default function HoldBillsPage() {
  // State management
  const [holdBills, setHoldBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loaders, setLoaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingHoldBill, setEditingHoldBill] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [holdBillsRes, customersRes, productsRes, loadersRes] = await Promise.all([
        fetch('/api/hold-bills'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/loaders')
      ]);

      if (holdBillsRes.ok) {
        const holdBillsData = await holdBillsRes.json();
        setHoldBills(holdBillsData);
      }
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
      if (loadersRes.ok) {
        const loadersData = await loadersRes.json();
        setLoaders(loadersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredHoldBills = holdBills.filter(holdBill => {
    const matchesSearch = holdBill.customer?.cus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         holdBill.hold_bill_id?.toString().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomer || holdBill.cus_id === selectedCustomer;
    const matchesStatus = !selectedStatus || holdBill.status === selectedStatus;
    
    return matchesSearch && matchesCustomer && matchesStatus;
  });

  const sortedHoldBills = filteredHoldBills.sort((a, b) => {
    let aValue, bValue;
    
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'total_amount') {
      aValue = parseFloat(a.total_amount);
      bValue = parseFloat(b.total_amount);
    } else if (sortBy === 'customer') {
      aValue = a.customer?.cus_name.toLowerCase();
      bValue = b.customer?.cus_name.toLowerCase();
    } else {
      aValue = a[sortBy];
      bValue = b[sortBy];
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const finalHoldBills = sortedHoldBills.map((holdBill, index) => ({
    ...holdBill,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalHoldBills = holdBills.length;
  const draftHoldBills = holdBills.filter(h => h.status === 'DRAFT').length;
  const pendingHoldBills = holdBills.filter(h => h.status === 'PENDING').length;
  const convertedHoldBills = holdBills.filter(h => h.status === 'CONVERTED').length;
  const totalHoldBillValue = holdBills.reduce((sum, h) => sum + parseFloat(h.total_amount) - parseFloat(h.discount) + parseFloat(h.shipping_amount || 0), 0);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'PENDING':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'CONVERTED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800';
      case 'CONVERTED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConvertToSale = async (holdBillId) => {
    if (window.confirm('Are you sure you want to convert this hold bill to a sale? This will process the transaction and update stock.')) {
      try {
        const response = await fetch('/api/hold-bills/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hold_bill_id: holdBillId, updated_by: 1 }) // TODO: Get actual user ID
        });

        if (response.ok) {
          await fetchData();
          alert('Hold bill converted to sale successfully!');
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (error) {
        console.error('Error converting hold bill:', error);
        alert('Failed to convert hold bill');
      }
    }
  };

  const handleDelete = async (holdBillId) => {
    if (window.confirm('Are you sure you want to delete this hold bill?')) {
      try {
        const response = await fetch(`/api/hold-bills?id=${holdBillId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting hold bill:', error);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('');
    setSelectedStatus('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Render Hold Bills List View
  const renderHoldBillsListView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hold Bills Management</h2>
              <p className="text-gray-600 mt-1">Manage your hold bills and convert them to sales</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/sales'}
              className="group bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Create Hold Bill
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-orange-600 hover:text-orange-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search hold bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="customer-asc">Customer A-Z</option>
                  <option value="customer-desc">Customer Z-A</option>
                  <option value="total_amount-desc">Amount High-Low</option>
                  <option value="total_amount-asc">Amount Low-High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hold Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{totalHoldBills}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-2xl font-bold text-gray-900">{draftHoldBills}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Converted</p>
                  <p className="text-2xl font-bold text-gray-900">{convertedHoldBills}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{totalHoldBillValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Hold Bills List</h3>
              <span className="text-sm text-gray-500">
                Showing {finalHoldBills.length} of {holdBills.length} hold bills
              </span>
            </div>
            
            {finalHoldBills.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hold bills found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCustomer || selectedStatus
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by creating your first hold bill.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Desktop Table */}
                <div className="hidden lg:block flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalHoldBills.map((holdBill) => (
                      <div key={holdBill.hold_bill_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                        {/* Hold Bill */}
                        <div className="col-span-2 flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">Hold Bill #{holdBill.sequentialId}</div>
                            <div className="text-xs text-gray-500">ID: {holdBill.hold_bill_id}</div>
                          </div>
                        </div>

                        {/* Customer */}
                        <div className="col-span-2 flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{holdBill.customer?.cus_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{holdBill.customer?.cus_phone_no || 'N/A'}</div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="col-span-2">
                          <div className="text-sm font-semibold text-orange-600">{fmtAmt(holdBill.total_amount)}</div>
                          <div className="text-xs text-gray-500">
                            Items: {holdBill.hold_bill_details?.length || 0} | 
                            Discount: {fmtAmt(holdBill.discount)}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2 flex items-center">
                          <div className="flex items-center">
                            {getStatusIcon(holdBill.status)}
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(holdBill.status)}`}>
                              {holdBill.status}
                            </span>
                          </div>
                        </div>

                        {/* Created */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-sm text-gray-900">
                            {new Date(holdBill.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center">
                          <div className="flex items-center space-x-2">
                            {holdBill.status === 'DRAFT' && (
                              <button
                                onClick={() => handleConvertToSale(holdBill.hold_bill_id)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                title="Convert to Sale"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(holdBill.hold_bill_id)}
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete Hold Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {finalHoldBills.map((holdBill) => (
                      <div key={holdBill.hold_bill_id} className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Hold Bill #{holdBill.sequentialId}</div>
                              <div className="text-xs text-gray-500">ID: {holdBill.hold_bill_id}</div>
                            </div>
                            <div className="flex items-center">
                              {getStatusIcon(holdBill.status)}
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(holdBill.status)}`}>
                                {holdBill.status}
                              </span>
                            </div>
                          </div>

                          {/* Customer */}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{holdBill.customer?.cus_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{holdBill.customer?.cus_phone_no || 'N/A'}</div>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-orange-600">{fmtAmt(holdBill.total_amount)}</div>
                              <div className="text-xs text-gray-500">
                                Items: {holdBill.hold_bill_details?.length || 0} | 
                                Discount: {fmtAmt(holdBill.discount)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{new Date(holdBill.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end space-x-2">
                            {holdBill.status === 'DRAFT' && (
                              <button
                                onClick={() => handleConvertToSale(holdBill.hold_bill_id)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                title="Convert to Sale"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(holdBill.hold_bill_id)}
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete Hold Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return renderHoldBillsListView();
}


