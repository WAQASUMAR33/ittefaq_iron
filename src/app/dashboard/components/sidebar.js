'use client';

import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Users, 
  Package, 
  FileText, 
  DollarSign, 
  ShoppingCart, 
  ShoppingBag, 
  Truck, 
  User,
  Tag,
  Folder,
  FolderOpen,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  ChevronDown,
  X,
  LogOut
} from 'lucide-react';

export default function Sidebar({ 
  sidebarOpen, 
  setSidebarOpen, 
  activeTab, 
  setActiveTab, 
  expandedDropdowns, 
  setExpandedDropdowns,
  user,
  handleLogout 
}) {
  const router = useRouter();
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, category: 'main' },
    
    // Customer Management
    { id: 'customercategory', name: 'Customer Categories', icon: Tag, category: 'customer-management', parent: 'Customer Management' },
    { id: 'customers', name: 'Customer List', icon: Users, category: 'customer-management', parent: 'Customer Management' },
    
    // Product Management
    { id: 'categories', name: 'Category Management', icon: Folder, category: 'product-management', parent: 'Product Management' },
    { id: 'sub-categories', name: 'Sub Category Management', icon: FolderOpen, category: 'product-management', parent: 'Product Management' },
    { id: 'products', name: 'Product List', icon: Package, category: 'product-management', parent: 'Product Management' },
    
    // Financial Management
    { id: 'ledger', name: 'Ledger', icon: FileText, category: 'financial', parent: 'Finance' },
    { id: 'expense-titles', name: 'Expense Titles', icon: Tag, category: 'financial', parent: 'Finance' },
    { id: 'expenses', name: 'Expense Management', icon: DollarSign, category: 'financial', parent: 'Finance' },
    
    // Sales Operations
    { id: 'sales', name: 'Sales Management', icon: ShoppingCart, category: 'sales-operations', parent: 'Sales' },
    { id: 'sale-details', name: 'Sale Details', icon: Receipt, category: 'sales-operations', parent: 'Sales' },
    
    // Purchase Operations
    { id: 'purchases', name: 'Purchase Management', icon: ShoppingBag, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-details', name: 'Purchase Details', icon: FileSpreadsheet, category: 'purchase-operations', parent: 'Purchase' },
    
    // Cargo Operations
    { id: 'cargo', name: 'Cargo Management', icon: Truck, category: 'cargo-operations', parent: 'Cargo' },
    
    // System Management
    { id: 'usermanagement', name: 'User Management', icon: User, category: 'system', parent: 'System' }
  ];

  const toggleDropdown = (category) => {
    setExpandedDropdowns(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleNavigation = (itemId) => {
    setActiveTab(itemId);
    
    // Navigate to specific pages
    if (itemId === 'usermanagement') {
      router.push('/dashboard/usermanagement');
    } else if (itemId === 'customercategory') {
      router.push('/dashboard/customercategory');
    } else if (itemId === 'customers') {
      router.push('/dashboard/customers');
    } else if (itemId === 'categories') {
      router.push('/dashboard/categories');
    } else if (itemId === 'sub-categories') {
      router.push('/dashboard/subcategories');
    } else if (itemId === 'products') {
      router.push('/dashboard/products');
    } else if (itemId === 'purchases') {
      router.push('/dashboard/purchases');
    } else if (itemId === 'ledger') {
      router.push('/dashboard/finance');
    } else if (itemId === 'sales') {
      router.push('/dashboard/sales');
    } else if (itemId === 'expense-titles') {
      router.push('/dashboard/expense-titles');
    } else if (itemId === 'expenses') {
      router.push('/dashboard/expenses');
    } else if (itemId === 'dashboard') {
      router.push('/dashboard');
    }
    // For other items, they will show "Under Development" message
    
    // Close sidebar on mobile
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Fixed Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl border-r border-gray-200 transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:fixed lg:translate-x-0 lg:flex-shrink-0 lg:h-screen lg:flex lg:flex-col`}>
        
        {/* Sidebar Header with Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mr-4 shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Itefaq Builders
              </h1>
              <p className="text-xs text-gray-500 font-medium">POS System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 py-6 overflow-y-auto">
          <ul className="space-y-6">
            {/* Dashboard Section */}
            <li>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Overview</h3>
              {menuItems.filter(item => item.category === 'main').map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-all duration-200 group mb-1 ${
                    activeTab === item.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                  <span className="font-medium text-sm">{item.name}</span>
                </button>
              ))}
            </li>

            {/* Customer Management Section */}
            <li>
              <button
                onClick={() => toggleDropdown('customer-management')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                  expandedDropdowns['customer-management']
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-3 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer Management</h3>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedDropdowns['customer-management'] ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                expandedDropdowns['customer-management'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-8 mt-1 space-y-1">
                  {menuItems.filter(item => item.category === 'customer-management').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                        activeTab === item.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* Product Management Section */}
            <li>
              <button
                onClick={() => toggleDropdown('product-management')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                  expandedDropdowns['product-management']
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <Package className="w-5 h-5 mr-3 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Product Management</h3>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedDropdowns['product-management'] ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                expandedDropdowns['product-management'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-8 mt-1 space-y-1">
                  {menuItems.filter(item => item.category === 'product-management').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                        activeTab === item.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* Financial Section */}
            <li>
              <button
                onClick={() => toggleDropdown('financial')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                  expandedDropdowns['financial']
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-3 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Finance</h3>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedDropdowns['financial'] ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                expandedDropdowns['financial'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-8 mt-1 space-y-1">
                  {menuItems.filter(item => item.category === 'financial').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                        activeTab === item.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* Sales Operations Section */}
            <li>
              <button
                onClick={() => toggleDropdown('sales-operations')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                  expandedDropdowns['sales-operations']
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-3 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sales</h3>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedDropdowns['sales-operations'] ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                expandedDropdowns['sales-operations'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-8 mt-1 space-y-1">
                  {menuItems.filter(item => item.category === 'sales-operations').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                        activeTab === item.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* Purchase Operations Section */}
            <li>
              <button
                onClick={() => toggleDropdown('purchase-operations')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                  expandedDropdowns['purchase-operations']
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-3 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Purchase</h3>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedDropdowns['purchase-operations'] ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                expandedDropdowns['purchase-operations'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-8 mt-1 space-y-1">
                  {menuItems.filter(item => item.category === 'purchase-operations').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                        activeTab === item.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* Cargo Operations Section */}
            <li>
              <button
                onClick={() => toggleDropdown('cargo-operations')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                  expandedDropdowns['cargo-operations']
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <Truck className="w-5 h-5 mr-3 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cargo</h3>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedDropdowns['cargo-operations'] ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                expandedDropdowns['cargo-operations'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="ml-8 mt-1 space-y-1">
                  {menuItems.filter(item => item.category === 'cargo-operations').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                        activeTab === item.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* System Section */}
            <li>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">System</h3>
              {menuItems.filter(item => item.category === 'system').map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-all duration-200 group mb-1 ${
                    activeTab === item.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                  <span className="font-medium text-sm">{item.name}</span>
                </button>
              ))}
            </li>

          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500 font-medium uppercase">{user?.role}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
