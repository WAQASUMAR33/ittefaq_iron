/**
 * Centralized Global Theme and Color Palette System
 * Controls application-wide brand colors, UI status chips, table rows, and sidebar themes.
 */

export const THEME_COLORS = {
  // Core Brand Colors
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#7c3aed',
    light: '#a78bfa',
    dark: '#5b21b6',
    contrastText: '#ffffff',
  },

  // Semantic Status Colors
  success: {
    main: '#10b981',
    light: '#d1fae5',
    dark: '#047857',
    text: '#065f46',
    border: '#a7f3d0',
  },
  danger: {
    main: '#ef4444',
    light: '#fee2e2',
    dark: '#b91c1c',
    text: '#991b1b',
    border: '#fca5a5',
  },
  warning: {
    main: '#f59e0b',
    light: '#fef3c7',
    dark: '#b45309',
    text: '#92400e',
    border: '#fde68a',
  },
  info: {
    main: '#3b82f6',
    light: '#dbeafe',
    dark: '#1d4ed8',
    text: '#1e40af',
    border: '#93c5fd',
  },

  // Financial & Ledger Colors
  credit: {
    bg: '#dcfce7',
    text: '#15803d',
    border: '#16a34a',
    accent: '#22c55e',
  },
  debit: {
    bg: '#fee2e2',
    text: '#b91c1c',
    border: '#dc2626',
    accent: '#ef4444',
  },
  balance: {
    bg: '#e0f2fe',
    text: '#0369a1',
    border: '#0284c7',
    accent: '#0ea5e9',
  },

  // Neutrals & Surfaces
  background: {
    default: '#ffffff',
    paper: '#ffffff',
    subtle: '#f8fafc',
    muted: '#f1f5f9',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    disabled: '#94a3b8',
    white: '#ffffff',
  },
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
  },

  // Sidebar & Category Themes
  sidebar: {
    bg: '#ffffff',
    sales: '#04371a',
    purchases: '#00ac41',
    accounts: '#a434ff',
    reports: '#0e0061',
    orders: '#006d31',
    sectionColors: [
      '#d4ff00', '#00e676', '#1de9b6', '#00e5ff',
      '#2979ff', '#8c52ff', '#d500f9', '#ffd600',
    ],
  },
};

/**
 * Returns consistent status badge color tokens
 */
export const getStatusTheme = (status = '') => {
  const s = String(status).toLowerCase();
  if (['paid', 'completed', 'active', 'approved', 'yes'].includes(s)) {
    return THEME_COLORS.success;
  }
  if (['pending', 'unpaid', 'due', 'warning', 'partially paid'].includes(s)) {
    return THEME_COLORS.warning;
  }
  if (['cancelled', 'rejected', 'failed', 'inactive', 'overdue', 'no'].includes(s)) {
    return THEME_COLORS.danger;
  }
  return THEME_COLORS.info;
};

export default THEME_COLORS;
