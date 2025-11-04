'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  Package,
  Eye,
  EyeOff,
  ShoppingBag,
  FileText,
  ArrowLeftRight,
  Warehouse,
  Receipt,
  ClipboardList,
  RotateCcw
} from 'lucide-react';

export default function DashboardContent({ activeTab }) {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (activeTab === 'dashboard') {
        try {
          setLoading(true);
          const response = await fetch('/api/dashboard');
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setAnalyticsData(result.data);
            }
          }
        } catch (error) {
          console.error('Error fetching dashboard analytics:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
  }, [activeTab]);

  // Handle navigation to separate pages
  useEffect(() => {
    if (activeTab === 'usermanagement') {
      router.push('/dashboard/usermanagement');
    } else if (activeTab === 'customercategory') {
      router.push('/dashboard/customercategory');
    }
  }, [activeTab, router]);

  // If navigating to a separate page, show loading
  if (activeTab === 'usermanagement' || activeTab === 'customercategory') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Format number with commas
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return parseFloat(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const kpiData = analyticsData ? [
    {
      title: 'Total Sales',
      value: formatNumber(analyticsData.totalSales.value),
      change: `${analyticsData.totalSales.changeType === 'positive' ? '+' : ''}${analyticsData.totalSales.change}%`,
      changeType: analyticsData.totalSales.changeType,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Total Orders',
      value: analyticsData.totalOrders.value,
      change: `${analyticsData.totalOrders.changeType === 'positive' ? '+' : ''}${analyticsData.totalOrders.change}%`,
      changeType: analyticsData.totalOrders.changeType,
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Active Customers',
      value: analyticsData.activeCustomers.value,
      change: `${analyticsData.activeCustomers.changeType === 'positive' ? '+' : ''}${analyticsData.activeCustomers.change}%`,
      changeType: analyticsData.activeCustomers.changeType,
      icon: Users,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Total Products',
      value: analyticsData.totalProducts.value,
      change: `${analyticsData.totalProducts.changeType === 'positive' ? '+' : ''}${analyticsData.totalProducts.change}%`,
      changeType: analyticsData.totalProducts.changeType,
      icon: Package,
      color: 'from-orange-500 to-red-500'
    }
  ] : [
    {
      title: 'Total Sales',
      value: '0.00',
      change: '0.0%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Total Orders',
      value: '0',
      change: '0.0%',
      changeType: 'positive',
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Active Customers',
      value: '0',
      change: '0.0%',
      changeType: 'positive',
      icon: Users,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Total Products',
      value: '0',
      change: '0.0%',
      changeType: 'positive',
      icon: Package,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const recentActivity = [
    { id: 1, action: 'New order #1234', customer: 'John Doe', amount: '125.00', time: '2 min ago', status: 'success' },
    { id: 2, action: 'Product updated', product: 'iPhone 14', time: '5 min ago', status: 'info' },
    { id: 3, action: 'Customer registered', customer: 'Jane Smith', time: '10 min ago', status: 'success' },
    { id: 4, action: 'Payment received', order: '#1233', amount: '89.50', time: '15 min ago', status: 'success' },
    { id: 5, action: 'Low stock alert', product: 'MacBook Air', time: '20 min ago', status: 'warning' }
  ];

  const quickActions = [
    { title: 'New Sale', icon: ShoppingCart, color: 'from-blue-500 to-cyan-500', path: '/dashboard/sales?view=create' },
    { title: 'New Purchase', icon: ShoppingBag, color: 'from-indigo-500 to-blue-500', path: '/dashboard/purchases' },
    { title: 'Add Product', icon: Package, color: 'from-green-500 to-emerald-500', path: '/dashboard/products' },
    { title: 'Add Customer', icon: Users, color: 'from-purple-500 to-pink-500', path: '/dashboard/customers' },
    { title: 'Hold Bills', icon: ClipboardList, color: 'from-yellow-500 to-orange-500', path: '/dashboard/hold-bills' },
    { title: 'Sale Returns', icon: RotateCcw, color: 'from-red-500 to-pink-500', path: '/dashboard/sale-returns' },
    { title: 'Stock Transfer', icon: ArrowLeftRight, color: 'from-teal-500 to-cyan-500', path: '/dashboard/stock-transfer' },
    { title: 'Store Stock', icon: Warehouse, color: 'from-violet-500 to-purple-500', path: '/dashboard/store-stock' },
    { title: 'Expenses', icon: DollarSign, color: 'from-rose-500 to-red-500', path: '/dashboard/expenses' },
    { title: 'Ledger', icon: FileText, color: 'from-slate-500 to-gray-600', path: '/dashboard/finance' },
    { title: 'View Reports', icon: TrendingUp, color: 'from-orange-500 to-red-500', path: '/dashboard/reports' },
    { title: 'Sales List', icon: Receipt, color: 'from-cyan-500 to-blue-500', path: '/dashboard/sales' }
  ];

  const handleQuickActionClick = (path) => {
    router.push(path);
  };

  // Show different content based on active tab
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards - Analytics Widgets at Top */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                    <div className="flex items-center mt-2">
                      <span className={`text-sm font-medium ${
                        kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">from last month</span>
                    </div>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-r ${kpi.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <kpi.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {quickActions.map((action, index) => (
                <button 
                  key={index} 
                  onClick={() => handleQuickActionClick(action.path)}
                  className="group p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 text-center">{action.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
              <div className="flex items-center space-x-2">
                <button className="text-gray-400 hover:text-gray-600">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Sales chart will be displayed here</p>
                <p className="text-sm text-gray-500">Integration with chart library needed</p>
              </div>
            </div>
          </div>

          {/* Orders Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Orders Overview</h3>
              <div className="flex items-center space-x-2">
                <button className="text-gray-400 hover:text-gray-600">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <div className="text-center">
                <ShoppingCart className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Orders chart will be displayed here</p>
                <p className="text-sm text-gray-500">Integration with chart library needed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  {(activity.amount || activity.customer || activity.product) && (
                    <div className="text-right">
                      {activity.amount && <p className="text-sm font-medium text-gray-900">{activity.amount}</p>}
                      {activity.customer && <p className="text-xs text-gray-500">{activity.customer}</p>}
                      {activity.product && <p className="text-xs text-gray-500">{activity.product}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For other tabs that don't have separate pages yet
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {activeTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          <p className="text-gray-600 mb-8">
            This page is under development. More features will be added soon.
          </p>
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
