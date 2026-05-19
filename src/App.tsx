import { useEffect, useState, lazy, Suspense } from 'react';
import './index.css';

const MapView = lazy(() => import('./components/MapView'));

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
      <Suspense
        fallback={
          <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors duration-300">
            <div className="relative flex items-center justify-center">
              {/* Premium Glow effect */}
              <div className="absolute w-24 h-24 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
              {/* Modern loader spinner */}
              <div className="w-16 h-16 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin"></div>
            </div>
            <div className="mt-6 flex flex-col items-center space-y-1">
              <h2 className="text-lg font-semibold tracking-wide bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
                Initializing Map Experience
              </h2>
              <p className="text-xs text-muted-foreground font-medium animate-pulse">
                Loading geospatial services...
              </p>
            </div>
          </div>
        }
      >
        <MapView
          searchQuery={searchQuery}
          onSearch={handleSearch}
          hexPreviewEnabled={hexPreviewEnabled}
          onHexPreviewToggle={handleHexPreviewToggle}
          theme={theme}
          onThemeToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        />
      </Suspense>
    </div>
  );
}

export default App;
