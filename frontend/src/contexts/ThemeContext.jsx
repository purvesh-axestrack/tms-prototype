import { createContext, useContext, useLayoutEffect, useState } from 'react';
import { themes, defaultThemeId, getTheme } from '@/lib/themes';

const ThemeContext = createContext();

function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('tms_theme') || defaultThemeId);

  useLayoutEffect(() => {
    applyTheme(getTheme(themeId));
  }, [themeId]);

  const setTheme = (id) => {
    localStorage.setItem('tms_theme', id);
    setThemeId(id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
