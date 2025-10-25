'use client';

import { useRouter } from 'next/navigation';
import { 
  Calendar,
  Users,
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  FileText,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function ReportsPage() {
  const router = useRouter();

  const reports = [
    {
      id: 'sales-by-date',
      title: 'Sales Report (By Date)',
      description: 'View sales transactions within a date range',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      path: '/dashboard/reports/sales-by-date'
    },
    {
      id: 'sales-by-customer',
      title: 'Sales Report (Customer Wise)',
      description: 'View sales grouped by customers',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      path: '/dashboard/reports/sales-by-customer'
    },
    {
      id: 'customers-balance',
      title: 'Customers Balance Report',
      description: 'View all customers with their balance',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      path: '/dashboard/reports/customers-balance'
    },
    {
      id: 'customer-ledger',
      title: 'Customer Ledger',
      description: 'View detailed ledger for a specific customer',
      icon: FileText,
      color: 'from-indigo-500 to-blue-500',
      path: '/dashboard/reports/customer-ledger'
    },
    {
      id: 'purchases-by-date',
      title: 'Purchase Report (By Date)',
      description: 'View purchases within a date range',
      icon: ShoppingBag,
      color: 'from-orange-500 to-red-500',
      path: '/dashboard/reports/purchases-by-date'
    },
    {
      id: 'purchases-by-supplier',
      title: 'Purchase Report (Supplier Wise)',
      description: 'View purchases grouped by suppliers',
      icon: ShoppingCart,
      color: 'from-yellow-500 to-orange-500',
      path: '/dashboard/reports/purchases-by-supplier'
    },
    {
      id: 'expenses-by-date',
      title: 'Expense Report',
      description: 'View expenses within a date range',
      icon: DollarSign,
      color: 'from-red-500 to-pink-500',
      path: '/dashboard/reports/expenses-by-date'
    }
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reports Dashboard</h2>
              <p className="text-gray-600 mt-1">Generate and view various business reports</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => router.push(report.path)}
                  className="group bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-14 h-14 bg-gradient-to-r ${report.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {report.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span>View Report</span>
                    <TrendingUp className="w-4 h-4 ml-2" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


