'use client';

import { useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import THEME_COLORS from '@/lib/theme-colors';

const theme = createTheme({
  palette: {
    primary: THEME_COLORS.primary,
    secondary: THEME_COLORS.secondary,
    success: THEME_COLORS.success,
    error: THEME_COLORS.danger,
    warning: THEME_COLORS.warning,
    info: THEME_COLORS.info,
    background: THEME_COLORS.background,
    text: THEME_COLORS.text,
  },
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default function CustomThemeProvider({ children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const t = e.target;
      if (!t || typeof t.type !== 'string') return;
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && t.type === 'number') {
        e.preventDefault();
      }
    };

    const handleWheel = (e) => {
      const t = e.target;
      if (!t || typeof t.type !== 'string' || t.type !== 'number') return;
      if (typeof t.blur === 'function') t.blur();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

