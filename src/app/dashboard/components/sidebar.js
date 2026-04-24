'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Collapse,
  Tooltip,
  InputBase,
  useTheme,
  useMediaQuery
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
  Menu as MenuIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 320;

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

    // Accounts
    { id: 'customercategory', name: 'Account Categories', icon: LabelIcon, category: 'customer-management', parent: 'Accounts' },
    { id: 'customers', name: 'Accounts', icon: PeopleIcon, category: 'customer-management', parent: 'Accounts' },

    // Product Management
    { id: 'categories', name: 'Category Management', icon: FolderIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'sub-categories', name: 'Sub Category Management', icon: FolderOpenIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'products', name: 'Product List', icon: InventoryIcon, category: 'product-management', parent: 'Product Management' },

    // Financial Management
    { id: 'expense-titles', name: 'Expense Titles', icon: LabelIcon, category: 'financial', parent: 'Finance' },
    { id: 'expenses', name: 'Expense Management', icon: AttachMoneyIcon, category: 'financial', parent: 'Finance' },
    { id: 'journal', name: 'Journal Entries', icon: MenuBookIcon, category: 'financial', parent: 'Finance' },
    { id: 'day-end', name: 'Day End / Day Close', icon: CalendarIcon, category: 'financial', parent: 'Finance' },

    // Sales Operations
    { id: 'orders', name: 'Order List', icon: ListAltIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sales', name: 'Sales', icon: ShoppingCartIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'hold-bills', name: 'Hold Bills', icon: InventoryIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sale-returns', name: 'Sale Returns', icon: CloseIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'loaders', name: 'Loader/Transport', icon: LocalShippingIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'quotations', name: 'Quotations', icon: ReceiptIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sales-analytics', name: 'Sales Analytics', icon: TrendingUpIcon, category: 'sales-operations', parent: 'Sales' },

    // Purchase Operations
    { id: 'new-purchase', name: 'Create New Purchase', icon: AddIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-list', name: 'Purchase List', icon: ShoppingBagIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-returns', name: 'Purchase Returns', icon: AssignmentReturnIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'vehicles', name: 'Vehicle Management', icon: LocalShippingIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-details', name: 'Purchase Details', icon: TableChartIcon, category: 'purchase-operations', parent: 'Purchase' },

    // Cargo Operations
    { id: 'cargo', name: 'Cargo Management', icon: LocalShippingIcon, category: 'cargo-operations', parent: 'Cargo' },

    // Reports
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

    // System Management
    { id: 'usermanagement', name: 'User Management', icon: PersonIcon, category: 'system', parent: 'System' },
    { id: 'stores', name: 'Store Management', icon: StoreIcon, category: 'system', parent: 'System' },
    { id: 'store-stock', name: 'Store Stock', icon: InventoryIcon, category: 'system', parent: 'System' },
    { id: 'stock-transfer', name: 'Stock Transfer', icon: SwapHorizIcon, category: 'system', parent: 'System' },
    { id: 'settings', name: 'Biometric Settings', icon: PersonIcon, category: 'system', parent: 'System', adminOnly: true },
  ];

  const roleName =
    typeof user?.role === 'string'
      ? user.role
      : user?.role?.name || user?.role?.displayName || '';
  const isAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

  const visibleMenuItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

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
    } else if (itemId === 'settings') {
      router.push('/dashboard/settings');
    } else if (itemId === 'dashboard') {
      router.push('/dashboard');
    }

    // Close sidebar on mobile
    setSidebarOpen(false);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const drawerWidth = collapsed && !isMobile ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const isCollapsed = collapsed && !isMobile;

  const renderMenuSection = (category, title, IconComponent) => {
    const items = filteredItems.filter(item => item.category === category);
    if (isSearching && items.length === 0) return null;
    const isExpanded = isCollapsed ? false : (isSearching ? true : expandedDropdowns[category]);

    if (isCollapsed) {
      // Collapsed: show only icons with tooltips, no section header
      return (
        <Box key={category} sx={{ mb: 0.5 }}>
          {items.map((item) => (
            <Tooltip key={item.id} title={item.name} placement="right" arrow>
              <ListItemButton
                onClick={() => handleNavigation(item.id)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  minHeight: 44,
                  justifyContent: 'center',
                  px: 1,
                  backgroundColor: activeTab === item.id ? 'primary.light' : 'transparent',
                  color: activeTab === item.id ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    backgroundColor: activeTab === item.id ? 'primary.main' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
                  <item.icon fontSize="small" />
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ))}
          <Divider sx={{ my: 0.5, opacity: 0.4 }} />
        </Box>
      );
    }

    return (
      <Box key={category}>
        <ListItemButton
          onClick={() => toggleDropdown(category)}
          sx={{
            borderRadius: 2,
            mb: 1,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <IconComponent />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {title}
              </Typography>
            }
          />
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                sx={{
                  pl: 4,
                  borderRadius: 2,
                  mb: 0.5,
                  backgroundColor: activeTab === item.id ? 'primary.light' : 'transparent',
                  color: activeTab === item.id ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    backgroundColor: activeTab === item.id ? 'primary.main' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  <item.icon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: activeTab === item.id ? 600 : 400 }}>
                      {item.name}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </Box>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{
        p: isCollapsed ? 1 : 2,
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        minHeight: 72
      }}>
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5, width: 40, height: 40, flexShrink: 0 }}>
              <DashboardIcon />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '0.8rem',
                lineHeight: 1.2
              }}>
                Ittefaq Iron
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                POS System
              </Typography>
            </Box>
          </Box>
        )}

        {/* Collapse toggle (desktop) */}
        {!isMobile && (
          <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              size="small"
              sx={{ flexShrink: 0 }}
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Close button (mobile) */}
        {isMobile && (
          <IconButton onClick={() => setSidebarOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Search Bar - hidden when collapsed */}
      {!isCollapsed && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            backgroundColor: 'action.hover',
            '&:focus-within': {
              borderColor: 'primary.main',
              backgroundColor: 'background.paper',
            }
          }}>
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <InputBase
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ fontSize: 13 }}
              inputProps={{ 'aria-label': 'search sidebar menu' }}
            />
            {searchQuery && (
              <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', p: isCollapsed ? 0.5 : 2 }}>
        <List disablePadding>
          {/* Overview section */}
          {(!isSearching || filteredItems.some(i => i.category === 'main')) && (
            <Box sx={{ mb: isCollapsed ? 0 : 2 }}>
              {!isCollapsed && (
                <Typography variant="overline" sx={{
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: 1,
                  display: 'block'
                }}>
                  Overview
                </Typography>
              )}
              {filteredItems.filter(item => item.category === 'main').map((item) => (
                isCollapsed ? (
                  <Tooltip key={item.id} title={item.name} placement="right" arrow>
                    <ListItemButton
                      onClick={() => handleNavigation(item.id)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        minHeight: 44,
                        justifyContent: 'center',
                        px: 1,
                        backgroundColor: activeTab === item.id ? 'primary.light' : 'transparent',
                        color: activeTab === item.id ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          backgroundColor: activeTab === item.id ? 'primary.main' : 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
                        <item.icon fontSize="small" />
                      </ListItemIcon>
                    </ListItemButton>
                  </Tooltip>
                ) : (
                  <ListItemButton
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      backgroundColor: activeTab === item.id ? 'primary.light' : 'transparent',
                      color: activeTab === item.id ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        backgroundColor: activeTab === item.id ? 'primary.main' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                      <item.icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: activeTab === item.id ? 600 : 400 }}>
                          {item.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                )
              ))}
              {isCollapsed && <Divider sx={{ my: 0.5, opacity: 0.4 }} />}
            </Box>
          )}

          {/* Menu Sections */}
          {renderMenuSection('customer-management', 'Account Management', PeopleIcon)}
          {renderMenuSection('product-management', 'Product Management', InventoryIcon)}
          {renderMenuSection('financial', 'Finance', AttachMoneyIcon)}
          {renderMenuSection('sales-operations', 'Sales', ShoppingCartIcon)}
          {renderMenuSection('purchase-operations', 'Purchase', ShoppingBagIcon)}
          {renderMenuSection('cargo-operations', 'Cargo', LocalShippingIcon)}
          {renderMenuSection('reports', 'Reports', DashboardIcon)}

          {/* System section */}
          {(!isSearching || filteredItems.some(i => i.category === 'system')) && (
            <Box sx={{ mb: 2 }}>
              {!isCollapsed && (
                <Typography variant="overline" sx={{
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: 1,
                  display: 'block'
                }}>
                  System
                </Typography>
              )}
              {filteredItems.filter(item => item.category === 'system').map((item) => (
                isCollapsed ? (
                  <Tooltip key={item.id} title={item.name} placement="right" arrow>
                    <ListItemButton
                      onClick={() => handleNavigation(item.id)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        minHeight: 44,
                        justifyContent: 'center',
                        px: 1,
                        backgroundColor: activeTab === item.id ? 'primary.light' : 'transparent',
                        color: activeTab === item.id ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          backgroundColor: activeTab === item.id ? 'primary.main' : 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
                        <item.icon fontSize="small" />
                      </ListItemIcon>
                    </ListItemButton>
                  </Tooltip>
                ) : (
                  <ListItemButton
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      backgroundColor: activeTab === item.id ? 'primary.light' : 'transparent',
                      color: activeTab === item.id ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        backgroundColor: activeTab === item.id ? 'primary.main' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                      <item.icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: activeTab === item.id ? 600 : 400 }}>
                          {item.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                )
              ))}
            </Box>
          )}

          {/* No results */}
          {isSearching && filteredItems.length === 0 && (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No results for "{searchQuery}"
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {/* User Profile */}
      <Box sx={{ p: isCollapsed ? 0.5 : 2, borderTop: 1, borderColor: 'divider' }}>
        {isCollapsed ? (
          <Tooltip title={`${user?.email} (${user?.role?.displayName || user?.role?.name || user?.role}) — Logout`} placement="right" arrow>
            <IconButton onClick={handleLogout} sx={{ width: '100%', borderRadius: 2, py: 1 }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Box sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
              {user?.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {user?.email}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                {user?.role?.displayName || user?.role?.name || user?.role}
              </Typography>
            </Box>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} size="small">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
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
            borderRight: 1,
            borderColor: 'divider',
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
    </>
  );
}
