import { useEffect, useState } from 'react';
import MapView from './components/MapView';
import './index.css';

type Theme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'c3-maps-theme';

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hexPreviewEnabled, setHexPreviewEnabled] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(savedTheme)) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleHexPreviewToggle = (enabled: boolean) => {
    setHexPreviewEnabled(enabled);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-background text-foreground">
      <MapView
        searchQuery={searchQuery}
        onSearch={handleSearch}
        hexPreviewEnabled={hexPreviewEnabled}
        onHexPreviewToggle={handleHexPreviewToggle}
        theme={theme}
        onThemeToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />
    </div>
  );
}

export default App;
