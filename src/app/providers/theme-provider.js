'use client';

import { useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default function CustomThemeProvider({ children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent ArrowUp and ArrowDown from changing numeric values
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.target.type === 'number') {
        e.preventDefault();
      }
    };

    const handleWheel = (e) => {
      // Prevent mouse wheel from changing numeric values when focused
      if (e.target.type === 'number') {
        e.target.blur();
      }
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

