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
  RotateCcw,
  ScrollText,
  ListOrdered,
  TrendingDown,
  BookOpen,
  Clock
} from 'lucide-react';

export default function DashboardContent({ activeTab }) {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivityData, setRecentActivityData] = useState([]);
  const [chartsData, setChartsData] = useState(null);

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

  // Fetch recent activities and charts data
  useEffect(() => {
    const fetchRecentData = async () => {
      try {
        // Fetch all sales to calculate last 7 days
        const salesRes = await fetch('/api/sales?limit=100');
        const salesDataRaw = salesRes.ok ? await salesRes.json() : [];
        const salesList = Array.isArray(salesDataRaw) ? salesDataRaw : (salesDataRaw.data || []);

        // Fetch recent purchases
        const purchasesRes = await fetch('/api/purchases?limit=5');
        const purchasesData = purchasesRes.ok ? await purchasesRes.json() : [];

        // Fetch recent orders (from sales with ORDER bill type)
        const ordersData = salesList.filter(s => s.bill_type === 'ORDER').slice(0, 5);

        // Build recent activities from combined data
        const activities = [];
        
        // Add sales (most recent)
        salesList.slice(0, 3).forEach(sale => {
          activities.push({
            id: `sale-${sale.sale_id}`,
            action: `Sale #${sale.sale_id}`,
            customer: sale.customer?.cus_name || 'Customer',
            amount: parseFloat(sale.total_amount).toFixed(2),
            time: new Date(sale.created_at).toLocaleDateString(),
            status: 'success'
          });
        });

        // Add purchases
        const purchases = Array.isArray(purchasesData) ? purchasesData : (purchasesData.data || []);
        purchases.slice(0, 2).forEach(purchase => {
          activities.push({
            id: `purchase-${purchase.pur_id}`,
            action: `Purchase #${purchase.pur_id}`,
            customer: purchase.customer?.cus_name || 'Supplier',
            amount: parseFloat(purchase.total_amount).toFixed(2),
            time: new Date(purchase.created_at).toLocaleDateString(),
            status: 'info'
          });
        });

        setRecentActivityData(activities);

        // Build 7-day sales chart data (previous 6 days + current day)
        const today = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          last7Days.push({
            date: date,
            dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            total: 0
          });
        }

        // Group sales by day
        salesList.forEach(sale => {
          const saleDate = new Date(sale.created_at);
          saleDate.setHours(0, 0, 0, 0);
          
          const dayData = last7Days.find(d => d.date.getTime() === saleDate.getTime());
          if (dayData) {
            dayData.total += parseFloat(sale.total_amount || 0);
          }
        });

        // Build charts data with line chart format
        const chartData = {
          sales: last7Days.map(d => ({
            x: d.dateStr,
            y: d.total,
            date: d.date
          })),
          orders: ordersData.slice ? ordersData.slice(0, 7).map((o, idx) => ({
            x: `Order ${idx + 1}`,
            y: 1
          })) : []
        };
        setChartsData(chartData);
      } catch (error) {
        console.error('Error fetching recent data:', error);
      }
    };

    if (activeTab === 'dashboard') {
      fetchRecentData();
      
      // Auto-refresh the data every 60 seconds
      const interval = setInterval(() => {
        fetchRecentData();
      }, 60000);
      
      return () => clearInterval(interval);
    }
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

  const quickActions = [
    { title: 'New Sale', icon: ShoppingCart, color: 'from-blue-500 to-cyan-500', path: '/dashboard/sales?view=create' },
    { title: 'New Purchase', icon: ShoppingBag, color: 'from-indigo-500 to-blue-500', path: '/dashboard/purchases' },
    { title: 'Orders List', icon: ListOrdered, color: 'from-blue-600 to-indigo-600', path: '/dashboard/orders' },
    { title: 'Add Product', icon: Package, color: 'from-green-500 to-emerald-500', path: '/dashboard/products' },
    { title: 'Add Customer', icon: Users, color: 'from-purple-500 to-pink-500', path: '/dashboard/customers' },
    { title: 'Hold Bills', icon: ClipboardList, color: 'from-yellow-500 to-orange-500', path: '/dashboard/hold-bills' },
    { title: 'Stock Transfer', icon: ArrowLeftRight, color: 'from-teal-500 to-cyan-500', path: '/dashboard/stock-transfer' },
    { title: 'Store Stock', icon: Warehouse, color: 'from-violet-500 to-purple-500', path: '/dashboard/store-stock' },
    { title: 'Expenses', icon: DollarSign, color: 'from-rose-500 to-red-500', path: '/dashboard/expenses' },
    { title: 'Ledger', icon: FileText, color: 'from-slate-500 to-gray-600', path: '/dashboard/finance' },
    { title: 'View Reports', icon: TrendingUp, color: 'from-orange-500 to-red-500', path: '/dashboard/reports' },
    { title: 'Sale Return', icon: RotateCcw, color: 'from-orange-600 to-red-600', path: '/dashboard/sales?view=create&type=return' },
    { title: 'Purchase Return', icon: TrendingDown, color: 'from-red-600 to-rose-600', path: '/dashboard/purchases?view=create&type=return' },
    { title: 'Quotations List', icon: ScrollText, color: 'from-teal-500 to-emerald-500', path: '/dashboard/quotations' },
    { title: 'Sales List', icon: Receipt, color: 'from-cyan-500 to-blue-500', path: '/dashboard/sales' },
    { title: 'Journal Entries', icon: BookOpen, color: 'from-indigo-500 to-purple-500', path: '/dashboard/journal' },
    { title: 'Day End / Closing', icon: Clock, color: 'from-amber-500 to-orange-500', path: '/dashboard/day-end' }
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
                      <span className={`text-sm font-medium ${kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
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
            <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 flex items-center justify-center">
              {chartsData && chartsData.sales && chartsData.sales.length > 0 ? (
                <svg viewBox="0 0 600 200" className="w-full h-full">
                  {/* Background grid */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="600" height="200" fill="url(#grid)" />
                  
                  {/* Axes */}
                  <line x1="30" y1="170" x2="580" y2="170" stroke="#9ca3af" strokeWidth="1" />
                  <line x1="30" y1="10" x2="30" y2="170" stroke="#9ca3af" strokeWidth="1" />
                  
                  {/* Y-axis labels */}
                  <text x="25" y="175" fontSize="10" fill="#6b7280" textAnchor="end">0</text>
                  {chartsData.sales.length > 0 && (() => {
                    const maxValue = Math.max(...chartsData.sales.map(d => d.y), 1);
                    const step = Math.ceil(maxValue / 4);
                    return [1, 2, 3, 4].map((i) => {
                      const value = step * i;
                      const y = 170 - ((value / maxValue) * 160);
                      return (
                        <g key={`y-${i}`}>
                          <line x1="25" y1={y} x2="30" y2={y} stroke="#9ca3af" strokeWidth="1" />
                          <text x="25" y={y + 3} fontSize="10" fill="#6b7280" textAnchor="end">PKR {(value/1000).toFixed(0)}K</text>
                        </g>
                      );
                    });
                  })()}
                  
                  {/* Line chart path */}
                  {chartsData.sales.length > 0 && (() => {
                    const maxValue = Math.max(...chartsData.sales.map(d => d.y), 1);
                    const xStep = 550 / (chartsData.sales.length - 1 || 1);
                    const points = chartsData.sales.map((data, idx) => {
                      const x = 30 + (idx * xStep);
                      const y = 170 - ((data.y / maxValue) * 160);
                      return `${x},${y}`;
                    }).join(' ');
                    
                    return (
                      <>
                        {/* Area under line */}
                        <path
                          d={`M 30,170 L ${chartsData.sales.map((data, idx) => {
                            const x = 30 + (idx * xStep);
                            const y = 170 - ((data.y / maxValue) * 160);
                            return `${x},${y}`;
                          }).join(' L ')} L 580,170 Z`}
                          fill="url(#lineGradient)"
                          opacity="0.3"
                        />
                        {/* Line */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {/* Data points */}
                        {chartsData.sales.map((data, idx) => {
                          const x = 30 + (idx * xStep);
                          const y = 170 - ((data.y / maxValue) * 160);
                          return (
                            <g key={`point-${idx}`}>
                              <circle cx={x} cy={y} r="3" fill="#3b82f6" stroke="#fff" strokeWidth="2" className="hover:r-5 transition-all" />
                              <title>{`${data.x}: PKR ${data.y.toFixed(0)}`}</title>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                  
                  {/* X-axis labels */}
                  {chartsData.sales.map((data, idx) => {
                    const xStep = 550 / (chartsData.sales.length - 1 || 1);
                    const x = 30 + (idx * xStep);
                    return (
                      <text key={`x-${idx}`} x={x} y="190" fontSize="10" fill="#6b7280" textAnchor="middle">
                        {data.x}
                      </text>
                    );
                  })}
                  
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.5}} />
                      <stop offset="100%" style={{stopColor: '#3b82f6', stopOpacity: 0}} />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                <div className="text-center w-full flex items-center justify-center">
                  <div>
                    <TrendingUp className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No sales data available</p>
                  </div>
                </div>
              )}
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
            <div className="h-64 flex items-end justify-around gap-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
              {chartsData && chartsData.orders && chartsData.orders.length > 0 ? (
                chartsData.orders.map((data, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 group">
                    <div className="text-xs font-medium text-gray-600 mb-2 group-hover:text-gray-900 transition-colors">{data.y}</div>
                    <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg hover:shadow-lg transition-all" style={{ height: '60px' }}></div>
                    <div className="text-xs text-gray-500 mt-2">{data.x}</div>
                  </div>
                ))
              ) : (
                <div className="text-center w-full flex items-center justify-center">
                  <div>
                    <ShoppingCart className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No orders data available</p>
                  </div>
                </div>
              )}
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
              {recentActivityData && recentActivityData.length > 0 ? (
                recentActivityData.map((activity) => (
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
                    {(activity.amount || activity.customer) && (
                      <div className="text-right">
                        {activity.amount && <p className="text-sm font-medium text-gray-900">PKR {activity.amount}</p>}
                        {activity.customer && <p className="text-xs text-gray-500">{activity.customer}</p>}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent activities</p>
                </div>
              )}
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
