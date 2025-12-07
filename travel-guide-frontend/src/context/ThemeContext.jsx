import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const THEME_KEY = 'appThemeMode';
const DEFAULT_THEME = 'dark'; // Mặc định là dark mode như trong HomePage

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    // Kiểm tra localStorage, nếu không có thì dùng 'homeThemeMode' để tương thích ngược
    const stored = localStorage.getItem(THEME_KEY) || localStorage.getItem('homeThemeMode');
    return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME;
  });

  // Lưu theme vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, themeMode);
      // Đồng bộ với 'homeThemeMode' để tương thích ngược
      localStorage.setItem('homeThemeMode', themeMode);
    }
  }, [themeMode]);

  // Lắng nghe thay đổi từ các tab/window khác
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === THEME_KEY || e.key === 'homeThemeMode') {
        const newTheme = e.newValue || DEFAULT_THEME;
        if (newTheme === 'light' || newTheme === 'dark') {
          setThemeModeState(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setThemeMode = (theme) => {
    const normalized = theme === 'light' ? 'light' : 'dark';
    setThemeModeState(normalized);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const isDarkMode = themeMode === 'dark';

  const value = {
    themeMode,
    setThemeMode,
    toggleTheme,
    isDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

