import { createContext, useContext, useLayoutEffect, useState } from 'react';
import { themes, defaultThemeId, getTheme } from '@/lib/themes';

const ThemeContext = createContext();

function applyTheme(theme) {
  let styleEl = document.getElementById('tms-theme-vars');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'tms-theme-vars';
    document.head.appendChild(styleEl);
  }
  const rules = Object.entries(theme.variables)
    .map(([k, v]) => `  ${k}: ${v} !important;`)
    .join('\n');
  styleEl.textContent = `:root {\n${rules}\n}`;
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
