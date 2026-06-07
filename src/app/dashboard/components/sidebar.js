'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  IconButton,
  Avatar,
  Collapse,
  Tooltip,
  InputBase,
  ListItemButton,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  AttachMoney as AttachMoneyIcon,
  ShoppingCart as ShoppingCartIcon,
  ShoppingBag as ShoppingBagIcon,
  LocalShipping as LocalShippingIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  TableChart as TableChartIcon,
  MenuBook as MenuBookIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  AssignmentReturn as AssignmentReturnIcon,
  SwapHoriz as SwapHorizIcon,
  PieChart as PieChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ListAlt as ListAltIcon,
  Badge as BadgeIcon,
  EventNote as EventNoteIcon,
  Payments as PaymentsIcon,
} from '@mui/icons-material';
import { isAdminRole as isAdminRoleName, getStaffRoleName, SALESMAN_ALLOWED_MENU_IDS } from '@/lib/staff-access';

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 280;
const SIDEBAR_BG = '#ffffff';

const SECTION_COLORS = [
  '#cce840',
  '#36c46c',
  '#e07240',
  '#7858d4',
  '#e04858',
  '#22c4d4',
  '#e8d440',
  '#3a9ef5',
];

const PILL_COLORS = [
  '#cce840',
  '#36c46c',
  '#e07240',
  '#7858d4',
  '#e04858',
  '#22c4d4',
  '#e8d440',
  '#3a9ef5',
  '#f5a623',
  '#50e3c2',
];

const PILL_WIDTHS = [
  '95%', '80%', '90%', '74%', '97%', '83%', '88%',
  '77%', '93%', '85%', '72%', '96%', '79%', '87%',
];

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  expandedDropdowns,
  setExpandedDropdowns,
  user,
  handleLogout,
  collapsed,
  setCollapsed
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: DashboardIcon, category: 'main' },
    { id: 'orders', name: 'Order List', icon: ListAltIcon, category: 'main' },
    { id: 'new-sale', name: 'New Sale', icon: AddIcon, category: 'main' },
    { id: 'purchases', name: 'New Purchase', icon: ShoppingBagIcon, category: 'main' },
    { id: 'cash-report', name: 'Cash Report', icon: AttachMoneyIcon, category: 'main' },
    { id: 'bank-report', name: 'Bank Report', icon: CreditCardIcon, category: 'main' },
    { id: 'ledger', name: 'Ledger', icon: DescriptionIcon, category: 'main' },

    { id: 'customercategory', name: 'Account Categories', icon: LabelIcon, category: 'customer-management', parent: 'Accounts' },
    { id: 'customers', name: 'Accounts', icon: PeopleIcon, category: 'customer-management', parent: 'Accounts' },

    { id: 'categories', name: 'Category Management', icon: FolderIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'sub-categories', name: 'Sub Category Management', icon: FolderOpenIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'products', name: 'Product List', icon: InventoryIcon, category: 'product-management', parent: 'Product Management' },

    { id: 'expense-titles', name: 'Expense Titles', icon: LabelIcon, category: 'financial', parent: 'Finance' },
    { id: 'expenses', name: 'Expense Management', icon: AttachMoneyIcon, category: 'financial', parent: 'Finance' },
    { id: 'journal', name: 'Journal Entries', icon: MenuBookIcon, category: 'financial', parent: 'Finance' },
    { id: 'day-end', name: 'Day End / Day Close', icon: CalendarIcon, category: 'financial', parent: 'Finance' },

    { id: 'orders', name: 'Order List', icon: ListAltIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sales', name: 'Sales', icon: ShoppingCartIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'hold-bills', name: 'Hold Bills', icon: InventoryIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sale-returns', name: 'Sale Returns', icon: CloseIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'loaders', name: 'Loader/Transport', icon: LocalShippingIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'quotations', name: 'Quotations', icon: ReceiptIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sales-analytics', name: 'Sales Analytics', icon: TrendingUpIcon, category: 'sales-operations', parent: 'Sales' },

    { id: 'new-purchase', name: 'Create New Purchase', icon: AddIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-list', name: 'Purchase List', icon: ShoppingBagIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-returns', name: 'Purchase Returns', icon: AssignmentReturnIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'vehicles', name: 'Vehicle Management', icon: LocalShippingIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-details', name: 'Purchase Details', icon: TableChartIcon, category: 'purchase-operations', parent: 'Purchase' },

    { id: 'cargo', name: 'Cargo Management', icon: LocalShippingIcon, category: 'cargo-operations', parent: 'Cargo' },

    { id: 'reports-dashboard', name: 'Reports Dashboard', icon: DashboardIcon, category: 'reports', parent: 'Reports' },
    { id: 'sales-by-date', name: 'Sales (By Date)', icon: CalendarIcon, category: 'reports', parent: 'Reports' },
    { id: 'sales-by-customer', name: 'Sales (Customer Wise)', icon: PeopleIcon, category: 'reports', parent: 'Reports' },
    { id: 'customer-balance-report', name: 'Customer Balance Report', icon: TableChartIcon, category: 'reports', parent: 'Reports' },
    { id: 'customers-balance', name: 'Customers Balance (Basic)', icon: AttachMoneyIcon, category: 'reports', parent: 'Reports' },
    { id: 'customer-ledger', name: 'Customer Ledger', icon: DescriptionIcon, category: 'reports', parent: 'Reports' },
    { id: 'purchases-by-date', name: 'Purchases (By Date)', icon: CalendarIcon, category: 'reports', parent: 'Reports' },
    { id: 'purchases-by-supplier', name: 'Purchases (Supplier Wise)', icon: ShoppingBagIcon, category: 'reports', parent: 'Reports' },
    { id: 'expenses-by-date', name: 'Expenses Report', icon: TrendingUpIcon, category: 'reports', parent: 'Reports' },
    { id: 'order-report', name: 'Order Report', icon: DescriptionIcon, category: 'reports', parent: 'Reports' },
    { id: 'stock-report', name: 'Stock Report', icon: InventoryIcon, category: 'reports', parent: 'Reports' },
    { id: 'sale-report', name: 'Sale Report', icon: ShoppingCartIcon, category: 'reports', parent: 'Reports' },
    { id: 'item-sale-report', name: 'Item Sale Report', icon: ShoppingCartIcon, category: 'reports', parent: 'Reports' },
    { id: 'profit-report', name: 'Profit Report', icon: TrendingUpIcon, category: 'reports', parent: 'Reports' },
    { id: 'purchase-report', name: 'Purchase Report', icon: ShoppingBagIcon, category: 'reports', parent: 'Reports' },
    { id: 'rebate-report', name: 'Rebate Report', icon: PieChartIcon, category: 'reports', parent: 'Reports' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: TableChartIcon, category: 'reports', parent: 'Reports' },

    { id: 'employees', name: 'Employees', icon: BadgeIcon, category: 'hr-management', parent: 'HR Management' },
    { id: 'attendance', name: 'Attendance', icon: EventNoteIcon, category: 'hr-management', parent: 'HR Management' },
    { id: 'payroll', name: 'Payroll / Salary', icon: PaymentsIcon, category: 'hr-management', parent: 'HR Management' },

    { id: 'usermanagement', name: 'User Management', icon: PersonIcon, category: 'system', parent: 'System' },
    { id: 'stores', name: 'Store Management', icon: StoreIcon, category: 'system', parent: 'System' },
    { id: 'store-stock', name: 'Store Stock', icon: InventoryIcon, category: 'system', parent: 'System' },
    { id: 'stock-transfer', name: 'Stock Transfer', icon: SwapHorizIcon, category: 'system', parent: 'System' },
    { id: 'settings', name: 'Biometric Settings', icon: PersonIcon, category: 'system', parent: 'System', adminOnly: true },
  ];

  const roleName = getStaffRoleName(user);
  const isAdmin = isAdminRoleName(roleName);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (isAdmin) return true;
    if (roleName === 'SALESMAN') return SALESMAN_ALLOWED_MENU_IDS.has(item.id);
    return SALESMAN_ALLOWED_MENU_IDS.has(item.id);
  });

  const isSearching = searchQuery.trim().length > 0;
  const filteredItems = isSearching
    ? visibleMenuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleMenuItems;

  const toggleDropdown = (category) => {
    setExpandedDropdowns(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleNavigation = (itemId) => {
    setActiveTab(itemId);

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
    } else if (itemId === 'purchases' || itemId === 'purchase-list') {
      router.push('/dashboard/purchases');
    } else if (itemId === 'new-purchase') {
      router.push('/dashboard/purchases?view=new');
    } else if (itemId === 'purchase-returns') {
      router.push('/dashboard/purchases?type=return');
    } else if (itemId === 'vehicles') {
      router.push('/dashboard/vehicles');
    } else if (itemId === 'ledger') {
      router.push('/dashboard/finance');
    } else if (itemId === 'sales') {
      router.push('/dashboard/sales');
    } else if (itemId === 'hold-bills') {
      router.push('/dashboard/hold-bills');
    } else if (itemId === 'sale-returns') {
      router.push('/dashboard/sales?type=return');
    } else if (itemId === 'loaders') {
      router.push('/dashboard/loaders');
    } else if (itemId === 'expense-titles') {
      router.push('/dashboard/expense-titles');
    } else if (itemId === 'expenses') {
      router.push('/dashboard/expenses');
    } else if (itemId === 'journal') {
      router.push('/dashboard/journal');
    } else if (itemId === 'day-end') {
      router.push('/dashboard/day-end');
    } else if (itemId === 'cargo') {
      router.push('/dashboard/cargo');
    } else if (itemId === 'new-sale') {
      router.push('/dashboard/sales');
    } else if (itemId === 'orders') {
      router.push('/dashboard/orders');
    } else if (itemId === 'quotations') {
      router.push('/dashboard/quotations');
    } else if (itemId === 'sales-analytics') {
      router.push('/dashboard/sales/analytics');
    } else if (itemId === 'reports-dashboard') {
      router.push('/dashboard/reports');
    } else if (itemId === 'sales-by-date') {
      router.push('/dashboard/reports/sales-by-date');
    } else if (itemId === 'sales-by-customer') {
      router.push('/dashboard/reports/sales-by-customer');
    } else if (itemId === 'customer-balance-report') {
      router.push('/dashboard/reports/customer-balance-report');
    } else if (itemId === 'customers-balance') {
      router.push('/dashboard/reports/customers-balance');
    } else if (itemId === 'customer-ledger') {
      router.push('/dashboard/reports/customer-ledger');
    } else if (itemId === 'purchases-by-date') {
      router.push('/dashboard/reports/purchases-by-date');
    } else if (itemId === 'purchases-by-supplier') {
      router.push('/dashboard/reports/purchases-by-supplier');
    } else if (itemId === 'expenses-by-date') {
      router.push('/dashboard/reports/expenses-by-date');
    } else if (itemId === 'cash-report') {
      router.push('/dashboard/reports/cash-report');
    } else if (itemId === 'bank-report') {
      router.push('/dashboard/reports/bank-report');
    } else if (itemId === 'order-report') {
      router.push('/dashboard/reports/order-report');
    } else if (itemId === 'stock-report') {
      router.push('/dashboard/reports/stock-report');
    } else if (itemId === 'sale-report') {
      router.push('/dashboard/reports/sale-report');
    } else if (itemId === 'item-sale-report') {
      router.push('/dashboard/reports/item-sale-report');
    } else if (itemId === 'profit-report') {
      router.push('/dashboard/reports/profit-report');
    } else if (itemId === 'purchase-report') {
      router.push('/dashboard/reports/purchase-report');
    } else if (itemId === 'rebate-report') {
      router.push('/dashboard/reports/rebate');
    } else if (itemId === 'balance-sheet') {
      router.push('/dashboard/reports/balance-sheet');
    } else if (itemId === 'stores') {
      router.push('/dashboard/stores');
    } else if (itemId === 'store-stock') {
      router.push('/dashboard/store-stock');
    } else if (itemId === 'stock-transfer') {
      router.push('/dashboard/stock-transfer');
    } else if (itemId === 'employees') {
      router.push('/dashboard/employees');
    } else if (itemId === 'attendance') {
      router.push('/dashboard/attendance');
    } else if (itemId === 'payroll') {
      router.push('/dashboard/payroll');
    } else if (itemId === 'settings') {
      router.push('/dashboard/settings');
    } else if (itemId === 'dashboard') {
      router.push('/dashboard');
    }

    setSidebarOpen(false);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'), { noSsr: true, defaultMatches: false });

  const drawerWidth = collapsed && !isMobile ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const isCollapsed = collapsed && !isMobile;

  const GoldCoin = () => (
    <Box sx={{
      width: 30,
      height: 30,
      borderRadius: '50%',
      flexShrink: 0,
      ml: 1,
      background: 'radial-gradient(circle at 35% 30%, #fff59d, #ffc107 50%, #e65100)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 3px rgba(255,255,255,0.5)',
      border: '1.5px solid rgba(255,200,50,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Box sx={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #fff9c4, #ffd54f 55%, #ff6f00)',
        border: '1px solid rgba(255,255,255,0.5)',
      }} />
    </Box>
  );

  // Colorful pill item with icon + text + optional gold coin
  const renderPillItem = (item, colorIdx, showCoin = false) => {
    const color = PILL_COLORS[colorIdx % PILL_COLORS.length];
    const width = PILL_WIDTHS[colorIdx % PILL_WIDTHS.length];
    const isActive = activeTab === item.id;

    return (
      <Box key={`${item.id}-${item.category}`} sx={{ mb: 0.9, px: 1.5 }}>
        <Box
          onClick={() => handleNavigation(item.id)}
          sx={{
            width,
            bgcolor: color,
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.9,
            cursor: 'pointer',
            outline: isActive ? '2.5px solid rgba(0,0,0,0.35)' : 'none',
            outlineOffset: '1px',
            boxShadow: isActive
              ? `0 4px 20px ${color}90`
              : `0 2px 8px ${color}60`,
            transition: 'all 0.15s ease',
            '&:hover': {
              boxShadow: `0 4px 16px ${color}80`,
              filter: 'brightness(1.06)',
              transform: 'translateX(2px)',
            },
          }}
        >
          <Box sx={{
            color: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            mr: 1.5,
            flexShrink: 0,
          }}>
            <item.icon sx={{ fontSize: 20 }} />
          </Box>
          <Typography sx={{
            fontWeight: 700,
            color: '#111',
            flex: 1,
            fontSize: '0.78rem',
            letterSpacing: 0.3,
            lineHeight: 1.3,
            userSelect: 'none',
          }}>
            {item.name}
          </Typography>
          {showCoin && <GoldCoin />}
        </Box>
      </Box>
    );
  };

  const renderCollapsedIcon = (item) => (
    <Tooltip key={item.id} title={item.name} placement="right" arrow>
      <ListItemButton
        onClick={() => handleNavigation(item.id)}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          minHeight: 44,
          justifyContent: 'center',
          px: 1,
          backgroundColor: activeTab === item.id ? 'rgba(0,0,0,0.08)' : 'transparent',
          color: activeTab === item.id ? '#111' : '#888',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
          <item.icon fontSize="small" />
        </ListItemIcon>
      </ListItemButton>
    </Tooltip>
  );

  const renderMenuSection = (category, title, sectionIdx) => {
    const items = filteredItems.filter(item => item.category === category);
    if (items.length === 0) return null;
    const isExpanded = isCollapsed ? false : (isSearching ? true : expandedDropdowns[category]);
    const sectionColor = SECTION_COLORS[sectionIdx % SECTION_COLORS.length];

    if (isCollapsed) {
      return (
        <Box key={category} sx={{ mb: 0.5 }}>
          {items.map(renderCollapsedIcon)}
          <Divider sx={{ my: 0.5, borderColor: 'rgba(0,0,0,0.08)' }} />
        </Box>
      );
    }

    return (
      <Box key={category} sx={{ mb: 0.5 }}>
        {/* Section header — colorful pill */}
        <Box sx={{ px: 1.5, mb: 0.3, mt: 1 }}>
          <Box
            onClick={() => toggleDropdown(category)}
            sx={{
              width: '100%',
              bgcolor: sectionColor,
              borderRadius: '22px',
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 0.9,
              cursor: 'pointer',
              boxShadow: `0 2px 8px ${sectionColor}50`,
              transition: 'all 0.15s ease',
              '&:hover': {
                filter: 'brightness(1.06)',
                boxShadow: `0 4px 14px ${sectionColor}70`,
              },
            }}
          >
            <Typography sx={{
              color: '#111',
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              flex: 1,
              userSelect: 'none',
            }}>
              {title}
            </Typography>
            {isExpanded
              ? <ExpandLess sx={{ fontSize: 16, color: 'rgba(0,0,0,0.5)' }} />
              : <ExpandMore sx={{ fontSize: 16, color: 'rgba(0,0,0,0.5)' }} />}
            <GoldCoin />
          </Box>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pt: 0.25, pb: 0.5 }}>
            {items.map((item) => {
              const globalIdx = visibleMenuItems.findIndex(i => i === item);
              return renderPillItem(item, globalIdx);
            })}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const mainItems = filteredItems.filter(item => item.category === 'main');
  const systemItems = filteredItems.filter(item => item.category === 'system');

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: SIDEBAR_BG }}>
      {/* Header */}
      <Box sx={{
        p: isCollapsed ? 1 : 2,
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        minHeight: 68,
        bgcolor: '#ffffff',
      }}>
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Avatar sx={{
              background: 'linear-gradient(135deg, #cce840, #36c46c)',
              mr: 1.5,
              width: 38,
              height: 38,
              flexShrink: 0,
            }}>
              <DashboardIcon sx={{ color: '#111', fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{
                fontWeight: 800,
                color: '#111',
                fontSize: '0.85rem',
                lineHeight: 1.2,
                letterSpacing: 0.5,
              }}>
                Ittefaq Iron
              </Typography>
              <Typography variant="caption" sx={{ color: '#888', fontWeight: 500 }}>
                POS System
              </Typography>
            </Box>
          </Box>
        )}

        {!isMobile && (
          <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              size="small"
              sx={{ color: '#aaa', flexShrink: 0, '&:hover': { color: '#333' } }}
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        )}

        {isMobile && (
          <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: '#888' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Search */}
      {!isCollapsed && (
        <Box sx={{ px: 1.5, py: 1.2, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.7,
            borderRadius: '20px',
            border: '1px solid rgba(0,0,0,0.12)',
            bgcolor: '#f5f5f5',
            '&:focus-within': { borderColor: '#36c46c', bgcolor: '#f0fff4' },
          }}>
            <SearchIcon sx={{ color: '#aaa', fontSize: 17 }} />
            <InputBase
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ fontSize: 12.5, color: '#333' }}
              inputProps={{ 'aria-label': 'search sidebar menu' }}
            />
            {searchQuery && (
              <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25, color: '#aaa' }}>
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1, px: isCollapsed ? 0.5 : 0 }}>
        <List disablePadding>
          {/* Overview */}
          {mainItems.length > 0 && (
            <Box sx={{ mb: 0.5 }}>
              {!isCollapsed && (
                <Box sx={{ px: 1.5, mb: 0.3, mt: 0.5 }}>
                  <Box sx={{
                    width: '100%',
                    bgcolor: '#111',
                    borderRadius: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 0.9,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}>
                    <Typography sx={{
                      color: '#cce840',
                      fontWeight: 800,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      fontSize: '0.72rem',
                      userSelect: 'none',
                    }}>
                      Overview
                    </Typography>
                  </Box>
                </Box>
              )}
              {mainItems.map((item) => {
                if (isCollapsed) return renderCollapsedIcon(item);
                const globalIdx = visibleMenuItems.findIndex(i => i === item);
                return renderPillItem(item, globalIdx, true);
              })}
              {isCollapsed && <Divider sx={{ my: 0.5, borderColor: 'rgba(0,0,0,0.08)' }} />}
            </Box>
          )}

          {renderMenuSection('customer-management', 'Accounts', 0)}
          {renderMenuSection('product-management', 'Products', 1)}
          {renderMenuSection('financial', 'Finance', 2)}
          {renderMenuSection('sales-operations', 'Sales', 3)}
          {renderMenuSection('purchase-operations', 'Purchase', 4)}
          {renderMenuSection('cargo-operations', 'Cargo', 5)}
          {renderMenuSection('hr-management', 'HR Management', 6)}
          {renderMenuSection('reports', 'Reports', 7)}

          {/* System */}
          {systemItems.length > 0 && (
            <Box sx={{ mb: 1 }}>
              {!isCollapsed && (
                <Box sx={{ px: 1.5, mb: 0.3, mt: 1 }}>
                  <Box sx={{
                    width: '100%',
                    bgcolor: '#555',
                    borderRadius: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 0.9,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}>
                    <Typography sx={{
                      color: '#fff',
                      fontWeight: 800,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      fontSize: '0.72rem',
                      userSelect: 'none',
                    }}>
                      System
                    </Typography>
                  </Box>
                </Box>
              )}
              {systemItems.map((item) => {
                if (isCollapsed) return renderCollapsedIcon(item);
                const globalIdx = visibleMenuItems.findIndex(i => i === item);
                return renderPillItem(item, globalIdx);
              })}
            </Box>
          )}

          {isSearching && filteredItems.length === 0 && (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#aaa' }}>
                No results for "{searchQuery}"
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {/* User Profile */}
      <Box sx={{ p: isCollapsed ? 0.5 : 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        {isCollapsed ? (
          <Tooltip title={`${user?.email} — Logout`} placement="right" arrow>
            <IconButton onClick={handleLogout} sx={{ width: '100%', borderRadius: 2, py: 1, color: '#888' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Box sx={{
            p: 1.5,
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.08)',
            bgcolor: '#f8f8f8',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Avatar sx={{
              background: 'linear-gradient(135deg, #7858d4, #22c4d4)',
              mr: 1.5,
              width: 34,
              height: 34,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}>
              {user?.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#222', fontSize: '0.75rem' }} noWrap>
                {user?.email}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                {user?.role?.displayName || user?.role?.name || user?.role}
              </Typography>
            </Box>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} size="small" sx={{ color: '#bbb', '&:hover': { color: '#e04858' } }}>
                <LogoutIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? sidebarOpen : true}
      onClose={() => setSidebarOpen(false)}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          bgcolor: SIDEBAR_BG,
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
