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

/**
 * Returns true if this staff role may view the given pathname.
 */
export function canStaffAccessPath(roleName, pathname) {
  if (isAdminRole(roleName)) return true;
  if (roleName === 'SALESMAN') return isPathAllowedForSalesman(pathname);
  // Unknown or tampered role: only home
  return normalizePath(pathname) === '/dashboard';
}
