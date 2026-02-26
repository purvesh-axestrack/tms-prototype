import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function ThemeSelector() {
  const { themeId, setTheme, themes } = useTheme();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Theme</h3>
        <p className="text-xs text-muted-foreground">Choose a color scheme for the interface.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {themes.map((t) => (
          <Card
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`cursor-pointer p-3 transition-all hover:ring-2 hover:ring-ring ${
              themeId === t.id ? 'ring-2 ring-amber-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-[11px] text-muted-foreground">{t.description}</div>
              </div>
              {themeId === t.id && (
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex gap-1 rounded overflow-hidden h-6">
              {t.preview.map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
