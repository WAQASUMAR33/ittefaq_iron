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

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 320;

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
    setIsClient(true);

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

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
      } else if (currentPath.startsWith('/dashboard/reports/rebate')) {
        setActiveTab('rebate-report');
      } else if (currentPath.startsWith('/dashboard/reports')) {
        setActiveTab('reports');
      } else if (currentPath.startsWith('/dashboard/stores')) {
        setActiveTab('stores');
      } else if (currentPath === '/dashboard') {
        setActiveTab('dashboard');
      }
    } catch (error) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const sidebarWidth = (!isMobile && collapsed) ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  if (!isClient || !user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={80} />
      </Box>
    );
  }

  return (
    <ClientOnly fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={80} />
      </Box>
    }>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
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
            width: { lg: `calc(100% - ${sidebarWidth}px)` },
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
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
              p: 1
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </ClientOnly>
  );
}
