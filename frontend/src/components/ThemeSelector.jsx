import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Check } from 'lucide-react';

const THEMES = [
  {
    id: 'default',
    name: 'Navy & Amber',
    sidebar: '#0f172a',
    accent: '#f59e0b',
    description: 'The classic TMS look',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    sidebar: '#0c1929',
    accent: '#0ea5e9',
    description: 'Cool and professional',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    sidebar: '#14231a',
    accent: '#10b981',
    description: 'Natural and calm',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    sidebar: '#27150a',
    accent: '#f97316',
    description: 'Warm and energetic',
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    sidebar: '#1a1035',
    accent: '#8b5cf6',
    description: 'Modern and sleek',
  },
  {
    id: 'ruby',
    name: 'Ruby Red',
    sidebar: '#2a0f1a',
    accent: '#e11d48',
    description: 'Bold and striking',
  },
];

function applyTheme(themeId) {
  if (themeId === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeId);
  }
  localStorage.setItem('tms_theme', themeId);
}

function getStoredTheme() {
  return localStorage.getItem('tms_theme') || 'default';
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export default function ThemeSelector() {
  const [active, setActive] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(active);
  }, [active]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Palette className="w-5 h-5" /> Appearance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Choose a color theme for the application.</p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => setActive(theme.id)}
              className={`relative flex flex-col rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
                active === theme.id ? 'border-current shadow-sm' : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              style={active === theme.id ? { borderColor: theme.accent } : undefined}
            >
              {active === theme.id && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {/* Preview swatch */}
              <div className="flex gap-1.5 mb-3">
                <div
                  className="w-8 h-14 rounded-md"
                  style={{ backgroundColor: theme.sidebar }}
                />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 rounded-full bg-muted w-full" />
                  <div
                    className="h-2 rounded-full w-3/4"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <div className="h-2 rounded-full bg-muted w-5/6" />
                  <div className="h-2 rounded-full bg-muted w-2/3" />
                </div>
              </div>
              <div className="text-sm font-semibold">{theme.name}</div>
              <div className="text-xs text-muted-foreground">{theme.description}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
