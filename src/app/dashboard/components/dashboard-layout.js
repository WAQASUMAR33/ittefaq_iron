'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './header';
import Sidebar from './sidebar';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedDropdowns, setExpandedDropdowns] = useState({
    'dashboard': false,
    'customer-management': false,
    'product-management': false,
    'financial': false,
    'sales-operations': false,
    'purchase-operations': false,
    'cargo-operations': false,
    'system': false
  });

  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    console.log('Dashboard layout - userData from localStorage:', userData);
    
    if (!userData) {
      console.log('No user data found, redirecting to login');
      router.push('/login');
      return;
    }

      try {
        const parsedUser = JSON.parse(userData);
        console.log('Parsed user data:', parsedUser);
        setUser(parsedUser);
        
        // Set initial active tab based on current route
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard/usermanagement')) {
          setActiveTab('usermanagement');
        } else if (currentPath.startsWith('/dashboard/customercategory')) {
          setActiveTab('customercategory');
        } else if (currentPath.startsWith('/dashboard/customers')) {
          setActiveTab('customers');
        } else if (currentPath.startsWith('/dashboard/categories')) {
          setActiveTab('categories');
        } else if (currentPath.startsWith('/dashboard/subcategories')) {
          setActiveTab('sub-categories');
        } else if (currentPath === '/dashboard') {
          setActiveTab('dashboard');
        }
      } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    // Clear all user-related data
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        expandedDropdowns={expandedDropdowns}
        setExpandedDropdowns={setExpandedDropdowns}
        user={user}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-80 bg-white">
        {/* Header */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab={activeTab}
          user={user}
        />

        {/* Main Content Area */}
        <main className="overflow-y-auto h-screen bg-white">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
