/**
 * Staff (Users table) role checks for the POS dashboard.
 * SUPER_ADMIN / ADMIN: full /dashboard access.
 * SALESMAN: sales-floor routes only (blocks direct URL access to admin areas).
 */

export function getStaffRoleName(user) {
  if (!user) return '';
  if (typeof user.role === 'string') return user.role;
  return user.role?.name || user.role?.displayName || '';
}

export function isAdminRole(role) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

/** Menu item ids visible to SALESMAN (must match paths in isPathAllowedForSalesman). */
export const SALESMAN_ALLOWED_MENU_IDS = new Set([
  'dashboard',
  'orders',
  'new-sale',
  'sales',
  'hold-bills',
  'quotations',
  'sales-analytics',
  'sale-returns',
  'loaders',
]);

function normalizePath(pathname) {
  if (!pathname) return '/';
  let p = pathname;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

/**
 * SALESMAN may only open these areas (prefix match after /dashboard for listed segments).
 */
export function isPathAllowedForSalesman(pathname) {
  const p = normalizePath(pathname);
  if (p === '/dashboard') return true;

  const allowedPrefixes = [
    '/dashboard/orders',
    '/dashboard/quotations',
    '/dashboard/hold-bills',
    '/dashboard/loaders',
    '/dashboard/sales',
  ];

  return allowedPrefixes.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

export function canStaffAccessPath(userOrRole, pathname) {
  const user = typeof userOrRole === 'object' ? userOrRole : null;
  const roleName = user ? getStaffRoleName(user) : userOrRole;
  
  if (roleName === 'SUPER_ADMIN') return true;

  const p = normalizePath(pathname);
  if (p === '/dashboard' || p === '/dashboard/') return true;

  // Check allowed modules if user object is available
  let allowed = [];
  if (user) {
    try {
      if (user.allowed_modules) {
        allowed = typeof user.allowed_modules === 'string'
          ? JSON.parse(user.allowed_modules)
          : user.allowed_modules;
      }
    } catch (e) {
      console.error('Failed to parse user.allowed_modules:', e);
    }
  }

  if (Array.isArray(allowed) && allowed.length > 0) {
    const modulePrefixMap = {
      '/dashboard/usermanagement': 'system',
      '/dashboard/stores': 'system',
      '/dashboard/store-stock': 'system',
      '/dashboard/stock-transfer': 'system',
      '/dashboard/settings': 'system',
      '/dashboard/customercategory': 'accounts',
      '/dashboard/customers': 'accounts',
      '/dashboard/categories': 'products',
      '/dashboard/subcategories': 'products',
      '/dashboard/products': 'products',
      '/dashboard/vehicles': 'purchases',
      '/dashboard/purchases': 'purchases',
      '/dashboard/expense-titles': 'finance',
      '/dashboard/expenses': 'finance',
      '/dashboard/journal': 'finance',
      '/dashboard/day-end': 'finance',
       '/dashboard/finance': 'finance',
      '/dashboard/internal-transfer': 'finance',
      '/dashboard/cargo': 'cargo',
      '/dashboard/orders': 'sales',
      '/dashboard/quotations': 'sales',
      '/dashboard/loaders': 'sales',
      '/dashboard/sales': 'sales',
      '/dashboard/hold-bills': 'sales',
      '/dashboard/reports/profit-report': 'profit_report',
      '/dashboard/reports': 'reports',
      '/dashboard/employees': 'hr',
      '/dashboard/attendance': 'hr',
      '/dashboard/payroll': 'hr',
    };

    const sortedPrefixes = Object.keys(modulePrefixMap).sort((a, b) => b.length - a.length);
    for (const prefix of sortedPrefixes) {
      if (p === prefix || p.startsWith(`${prefix}/`)) {
        const requiredModule = modulePrefixMap[prefix];
        return allowed.includes(requiredModule);
      }
    }
    return false;
  }

  // Fallback to role-based check if allowed_modules is empty/null or not user object
  if (roleName === 'SUPER_ADMIN' || roleName === 'ADMIN') return true;
  if (roleName === 'SALESMAN') return isPathAllowedForSalesman(pathname);
  return false;
}
