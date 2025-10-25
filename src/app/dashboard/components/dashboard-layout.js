'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  CircularProgress, 
  useTheme, 
  useMediaQuery 
} from '@mui/material';
import Header from './header';
import Sidebar from './sidebar';
import ClientOnly from './client-only';

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
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);
    
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
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
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
        } else if (currentPath.startsWith('/dashboard/finance')) {
          setActiveTab('ledger');
        } else if (currentPath.startsWith('/dashboard/sales')) {
          setActiveTab('sales');
        } else if (currentPath.startsWith('/dashboard/purchases')) {
          setActiveTab('purchases');
        } else if (currentPath.startsWith('/dashboard/expense-titles')) {
          setActiveTab('expense-titles');
        } else if (currentPath.startsWith('/dashboard/expenses')) {
          setActiveTab('expenses');
        } else if (currentPath.startsWith('/dashboard/cargo')) {
          setActiveTab('cargo');
        } else if (currentPath.startsWith('/dashboard/new-sale')) {
          setActiveTab('sales');
        } else if (currentPath.startsWith('/dashboard/orders')) {
          setActiveTab('orders');
        } else if (currentPath.startsWith('/dashboard/quotations')) {
          setActiveTab('quotations');
        } else if (currentPath.startsWith('/dashboard/reports')) {
          setActiveTab('reports');
        } else if (currentPath.startsWith('/dashboard/stores')) {
          setActiveTab('stores');
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  // Show loading state until client-side hydration is complete
  if (!isClient || !user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress size={80} />
      </Box>
    );
  }

  return (
    <ClientOnly fallback={
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress size={80} />
      </Box>
    }>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
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
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { lg: `calc(100% - 320px)` },
            bgcolor: 'background.default',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activeTab={activeTab}
            user={user}
          />

          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              bgcolor: 'background.default',
              p: { xs: 2, sm: 3, lg: 4 }
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </ClientOnly>
  );
}
